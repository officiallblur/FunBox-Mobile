import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

async function resolveUserId(params: {
  userIdFromMetadata?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
}) {
  if (!supabaseAdmin) return null;
  if (params.userIdFromMetadata) return params.userIdFromMetadata;

  if (params.stripeSubscriptionId) {
    const { data } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', params.stripeSubscriptionId)
      .maybeSingle();
    if (data?.user_id) return data.user_id as string;
  }

  if (params.stripeCustomerId) {
    const { data } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', params.stripeCustomerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.user_id) return data.user_id as string;
  }

  return null;
}

async function resolvePlan(priceId?: string | null) {
  if (!supabaseAdmin || !priceId) {
    return { planId: null, maxQuality: 'SD' };
  }
  const { data } = await supabaseAdmin
    .from('plans')
    .select('id, max_quality')
    .eq('stripe_price_id', priceId)
    .maybeSingle();
  return { planId: data?.id ?? null, maxQuality: data?.max_quality ?? 'SD' };
}

async function upsertSubscriptionFromStripe(subscription: any) {
  if (!supabaseAdmin) return;

  const stripeSubscriptionId = subscription?.id ?? null;
  const stripeCustomerId = typeof subscription?.customer === 'string'
    ? subscription.customer
    : subscription?.customer?.id ?? null;
  const userId = await resolveUserId({
    userIdFromMetadata: subscription?.metadata?.user_id ?? null,
    stripeSubscriptionId,
    stripeCustomerId,
  });

  if (!userId) {
    return;
  }

  const priceId = subscription?.items?.data?.[0]?.price?.id ?? null;
  const { planId, maxQuality } = await resolvePlan(priceId);
  const status = subscription?.status ?? 'incomplete';
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  await supabaseAdmin
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        plan_id: planId,
        status,
        current_period_end: periodEnd,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
      },
      { onConflict: 'stripe_subscription_id' }
    );

  const canStream = status === 'active' || status === 'trialing';
  await supabaseAdmin
    .from('entitlements')
    .upsert(
      {
        user_id: userId,
        can_stream: canStream,
        max_quality: canStream ? maxQuality : 'SD',
      },
      { onConflict: 'user_id' }
    );
}

serve(async (req) => {
  if (!stripe || !supabaseAdmin || !STRIPE_WEBHOOK_SECRET) {
    return new Response('Missing server configuration', { status: 500 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      if (session?.mode === 'subscription' && session?.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
          expand: ['items.data.price'],
        });
        await upsertSubscriptionFromStripe(subscription);
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object as any;
      await upsertSubscriptionFromStripe(subscription);
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    return new Response(err?.message ?? 'Webhook error', { status: 400 });
  }
});
