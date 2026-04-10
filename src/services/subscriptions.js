import { supabase } from '../lib/supabase';
import { toErrorMessage } from './errors';

export async function getPlans() {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price_cents', { ascending: true });
    if (error) return { data: null, error: toErrorMessage(error, 'Failed to load plans') };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: toErrorMessage(err, 'Failed to load plans') };
  }
}

export async function getCurrentSubscription() {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { data: null, error: toErrorMessage(error, 'Failed to load subscription') };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: toErrorMessage(err, 'Failed to load subscription') };
  }
}

export async function getEntitlements() {
  try {
    const { data, error } = await supabase.from('entitlements').select('*').maybeSingle();
    if (error) return { data: null, error: toErrorMessage(error, 'Failed to load entitlements') };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: toErrorMessage(err, 'Failed to load entitlements') };
  }
}

export async function createCheckout(planId) {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { planId },
    });
    if (error) return { data: null, error: toErrorMessage(error, 'Checkout failed') };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: toErrorMessage(err, 'Checkout failed') };
  }
}

export async function openCustomerPortal() {
  try {
    const { data, error } = await supabase.functions.invoke('customer-portal', { body: {} });
    if (error) return { data: null, error: toErrorMessage(error, 'Failed to open portal') };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: toErrorMessage(err, 'Failed to open portal') };
  }
}
