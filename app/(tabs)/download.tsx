import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { funboxColors } from '@/constants/funbox-theme';
import { funboxTypography } from '@/constants/funbox-typography';
import { useAuth } from '@/src/context/AuthProvider';
import { useRouter } from 'expo-router';

export default function DownloadScreen() {
  const router = useRouter();
  const { session } = useAuth();

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Download</Text>
      <Text style={styles.subTitle}>Download the video and watch it offline.</Text>

      <View style={styles.storageCard}>
        <Text style={styles.storageLabel}>Internal storage</Text>
        <Text style={styles.storageValue}>109.94 GB · 71.93 GB remaining</Text>
        <Text style={styles.storageHint}>Uninterrupted Background Download Set Now</Text>
      </View>

      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No downloads yet</Text>
        <Text style={styles.emptyText}>Start downloading your favorite movies and series.</Text>
        <Pressable
          style={styles.emptyButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.emptyButtonText}>See What You Can Download</Text>
        </Pressable>
      </View>

      {!session ? (
        <View style={styles.signInBanner}>
          <Text style={styles.signInText}>Sign in to unlock more features</Text>
          <Pressable style={styles.signInButton} onPress={() => router.push('/login')}>
            <Text style={styles.signInButtonText}>Sign In</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: funboxColors.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 120,
    gap: 16,
  },
  title: {
    color: funboxColors.text,
    fontSize: 20,
    fontFamily: funboxTypography.movieTitle.fontFamily,
  },
  subTitle: {
    color: funboxColors.muted,
    ...funboxTypography.body,
  },
  storageCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  storageLabel: {
    color: funboxColors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontFamily: funboxTypography.body.fontFamily,
  },
  storageValue: {
    color: funboxColors.text,
    fontFamily: funboxTypography.body.fontFamily,
  },
  storageHint: {
    color: '#3b82f6',
    ...funboxTypography.body,
  },
  emptyCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    gap: 10,
    alignItems: 'center',
  },
  emptyTitle: {
    color: funboxColors.text,
    fontSize: 16,
    fontFamily: funboxTypography.movieTitle.fontFamily,
  },
  emptyText: {
    color: funboxColors.muted,
    textAlign: 'center',
    ...funboxTypography.body,
  },
  emptyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  emptyButtonText: {
    color: '#fff',
    ...funboxTypography.button,
  },
  signInBanner: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  signInText: {
    color: funboxColors.text,
    ...funboxTypography.body,
  },
  signInButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  signInButtonText: {
    color: '#fff',
    ...funboxTypography.button,
  },
});
