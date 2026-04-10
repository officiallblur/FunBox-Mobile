import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { WalletDashboard } from '@/src/components/WalletDashboard';

export default function WalletScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Ovomonie Wallet</Text>
      <WalletDashboard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#141414',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    color: '#f9d3b4',
    fontWeight: '700',
  },
});
