import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { FunboxHeading } from '@/components/funbox-heading';
import { funboxColors } from '@/constants/funbox-theme';
import { funboxFonts, funboxTypography } from '@/constants/funbox-typography';
import { useAuth } from '@/src/context/AuthProvider';
import {
  createCheckout,
  getCurrentSubscription,
  getEntitlements,
  getPlans,
  openCustomerPortal,
} from '@/src/services/subscriptions';

export default function SubscribeScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [entitlements, setEntitlements] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const statusLabel = useMemo(() => {
    if (subscription?.status) return subscription.status;
    if (entitlements?.can_stream) return 'active';
    return 'inactive';
  }, [entitlements?.can_stream, subscription?.status]);

  const activePlanId = subscription?.plan_id ?? null;
  const canStream = Boolean(entitlements?.can_stream);

  const load = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const [plansRes, subRes, entRes] = await Promise.all([
        getPlans(),
        session ? getCurrentSubscription() : Promise.resolve({ data: null, error: null }),
        session ? getEntitlements() : Promise.resolve({ data: null, error: null }),
      ]);

      if (plansRes.error) {
        setError(plansRes.error);
      } else {
        setPlans(plansRes.data ?? []);
      }

      if (subRes?.error) {
        setError(subRes.error);
      } else {
        setSubscription(subRes?.data ?? null);
      }

      if (entRes?.error) {
        setError(entRes.error);
      } else {
        setEntitlements(entRes?.data ?? null);
      }
    } catch (err) {
      setError('Failed to load plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session?.user?.id]);

  const handleSubscribe = async (planId: string) => {
    if (!session) {
      router.push('/login');
      return;
    }
    setActionLoading(planId);
    setMessage(null);
    try {
      const { data, error } = await createCheckout(planId);
      if (error) {
        setError(error);
        return;
      }
      if (data?.url) {
        Linking.openURL(data.url);
        setMessage('Redirecting to checkout...');
      }
    } catch (err) {
      setError('Checkout failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleManage = async () => {
    setActionLoading('manage');
    setMessage(null);
    try {
      const { data, error } = await openCustomerPortal();
      if (error) {
        setError(error);
        return;
      }
      if (data?.url) {
        Linking.openURL(data.url);
      }
    } catch (err) {
      setError('Failed to open billing portal.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.nav}>
        <Pressable style={styles.navButton} onPress={() => router.back()}>
          <Text style={styles.navText}>Back</Text>
        </Pressable>
        <Pressable style={styles.navButton} onPress={() => router.push('/')}>
          <Text style={styles.navText}>Home</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        <FunboxHeading style={styles.title}>Choose Your Plan</FunboxHeading>
        <Text style={styles.subTitle}>Unlock the full Funbox library with premium quality streaming.</Text>
      </View>

      {!authLoading && !session ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Sign in to subscribe</Text>
          <Text style={styles.noticeText}>Create an account to start your membership and manage billing.</Text>
          <View style={styles.noticeActions}>
            <Pressable style={styles.noticeButton} onPress={() => router.push('/login')}>
              <Text style={styles.noticeButtonText}>Sign in</Text>
            </Pressable>
            <Pressable style={[styles.noticeButton, styles.noticeButtonAlt]} onPress={() => router.push('/signup')}>
              <Text style={styles.noticeButtonText}>Create account</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {session ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Subscription status</Text>
          <Text style={styles.statusValue}>{statusLabel.toUpperCase()}</Text>
          {canStream ? (
            <Text style={styles.statusHint}>
              Streaming enabled • Max quality {entitlements?.max_quality ?? 'SD'}
            </Text>
          ) : (
            <Text style={styles.statusHint}>No active plan yet.</Text>
          )}
          {session && (subscription || canStream) ? (
            <Pressable style={styles.manageButton} onPress={handleManage}>
              <Text style={styles.manageButtonText}>
                {actionLoading === 'manage' ? 'Opening portal...' : 'Manage billing'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <View style={styles.planList}>
          {plans.map((plan) => {
            const isActive = activePlanId === plan.id && canStream;
            const price = `$${(plan.price_cents / 100).toFixed(2)}`;
            return (
              <View key={plan.id} style={[styles.planCard, isActive && styles.planCardActive]}>
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planPrice}>
                    {price} / {plan.interval}
                  </Text>
                </View>
                <Text style={styles.planMeta}>Max quality: {plan.max_quality}</Text>
                {isActive ? <Text style={styles.planActiveBadge}>Current plan</Text> : null}
                <Pressable
                  style={[styles.planButton, isActive && styles.planButtonActive]}
                  onPress={() => handleSubscribe(plan.id)}
                  disabled={actionLoading === plan.id}>
                  <Text style={styles.planButtonText}>
                    {actionLoading === plan.id ? 'Starting checkout...' : 'Choose plan'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: funboxColors.background,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 40,
    paddingBottom: 40,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navButton: {
    borderWidth: 1,
    borderColor: funboxColors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  navText: {
    color: funboxColors.text,
    ...funboxTypography.link,
  },
  header: {
    marginBottom: 24,
    gap: 10,
  },
  title: {
    fontSize: 32,
    color: funboxColors.accent,
  },
  subTitle: {
    color: funboxColors.muted,
    ...funboxTypography.body,
    lineHeight: 22,
  },
  notice: {
    borderWidth: 1,
    borderColor: funboxColors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  noticeTitle: {
    color: funboxColors.text,
    fontSize: 16,
    fontFamily: funboxFonts.bodyBold,
    marginBottom: 6,
  },
  noticeText: {
    color: funboxColors.muted,
    ...funboxTypography.body,
  },
  noticeActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  noticeButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: funboxColors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  noticeButtonAlt: {
    borderColor: 'rgba(249, 211, 180, 0.45)',
  },
  noticeButtonText: {
    color: funboxColors.text,
    ...funboxTypography.button,
  },
  statusCard: {
    borderWidth: 1,
    borderColor: funboxColors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(0,0,0,0.35)',
    gap: 8,
  },
  statusLabel: {
    color: funboxColors.muted,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontSize: 12,
    fontFamily: funboxFonts.body,
  },
  statusValue: {
    color: funboxColors.accent,
    fontSize: 20,
    fontFamily: funboxFonts.bodyBold,
  },
  statusHint: {
    color: funboxColors.text,
    ...funboxTypography.body,
  },
  manageButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: funboxColors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 6,
  },
  manageButtonText: {
    color: funboxColors.text,
    ...funboxTypography.button,
  },
  planList: {
    gap: 16,
  },
  planCard: {
    borderWidth: 1,
    borderColor: funboxColors.border,
    borderRadius: 18,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 10,
  },
  planCardActive: {
    borderColor: 'rgba(249, 211, 180, 0.55)',
    backgroundColor: 'rgba(249, 211, 180, 0.08)',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  planName: {
    color: funboxColors.text,
    fontSize: 18,
    fontFamily: funboxFonts.bodyBold,
  },
  planPrice: {
    color: funboxColors.accent,
    fontSize: 16,
    fontFamily: funboxFonts.bodyBold,
  },
  planMeta: {
    color: funboxColors.muted,
    ...funboxTypography.body,
  },
  planActiveBadge: {
    color: funboxColors.accent,
    ...funboxTypography.button,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 11,
  },
  planButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: funboxColors.accent,
  },
  planButtonActive: {
    backgroundColor: '#243B53',
  },
  planButtonText: {
    color: funboxColors.background,
    ...funboxTypography.button,
  },
  center: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#fda4af',
    ...funboxTypography.body,
  },
  message: {
    color: funboxColors.muted,
    marginTop: 12,
    ...funboxTypography.body,
  },
});
