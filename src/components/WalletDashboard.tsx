import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { createTransaction, getTransactions, getWallet } from '../services';

export function WalletDashboard() {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [walletRes, txRes] = await Promise.all([getWallet(), getTransactions({ limit: 10 })]);
    if (walletRes.error) setError(walletRes.error);
    if (txRes.error) setError(txRes.error);
    setWallet(walletRes.data);
    setTransactions(txRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleQuickAction = async (type: 'credit' | 'debit') => {
    setProcessing(true);
    const res = await createTransaction({ amount: 10, type });
    if (res.error) setError(res.error);
    await load();
    setProcessing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Wallet</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.balanceLabel}>Current Balance</Text>
      <Text style={styles.balance}>${Number(wallet?.balance ?? 0).toFixed(2)}</Text>

      <View style={styles.row}>
        <Pressable style={styles.button} onPress={() => handleQuickAction('credit')} disabled={processing}>
          <Text style={styles.buttonText}>{processing ? 'Processing...' : 'Add $10'}</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.buttonDanger]} onPress={() => handleQuickAction('debit')} disabled={processing}>
          <Text style={styles.buttonText}>{processing ? 'Processing...' : 'Spend $10'}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {transactions.length === 0 ? (
        <Text style={styles.muted}>No transactions yet.</Text>
      ) : (
        transactions.map((tx) => (
          <View key={tx.id} style={styles.txRow}>
            <Text style={styles.txType}>{tx.type}</Text>
            <Text style={styles.txAmount}>${Number(tx.amount).toFixed(2)}</Text>
            <Text style={styles.txStatus}>{tx.status}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f1720',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    color: '#e6eef8',
    fontWeight: '700',
  },
  balanceLabel: {
    color: '#9fb0c8',
    fontSize: 12,
  },
  balance: {
    fontSize: 28,
    color: '#60a5fa',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonDanger: {
    backgroundColor: '#b91c1c',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionTitle: {
    marginTop: 10,
    color: '#f9d3b4',
    fontWeight: '700',
  },
  muted: {
    color: '#9fb0c8',
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  txType: {
    color: '#e6eef8',
    textTransform: 'capitalize',
  },
  txAmount: {
    color: '#e6eef8',
    fontWeight: '600',
  },
  txStatus: {
    color: '#9fb0c8',
    textTransform: 'capitalize',
  },
  error: {
    color: '#fb7185',
  },
});
