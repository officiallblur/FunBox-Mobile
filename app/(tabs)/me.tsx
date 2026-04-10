import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { funboxColors } from '@/constants/funbox-theme';
import { funboxTypography } from '@/constants/funbox-typography';
import { useAuth } from '@/src/context/AuthProvider';
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';

export default function MeScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const handleSignOut = async () => {
    if (!isSupabaseConfigured) return;
    try {
      await requireSupabase().auth.signOut();
    } catch (error) {
      console.warn(error);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color={funboxColors.muted} />
        </View>
        <View>
          <Text style={styles.headerTitle}>{session ? 'Account' : 'Sign In/Sign Up'}</Text>
          <Text style={styles.headerSub}>{session?.user?.email ?? 'Sign in to view watch history'}</Text>
        </View>
      </View>

      {!session ? (
        <Pressable style={styles.signInButton} onPress={() => router.push('/login')}>
          <Text style={styles.signInButtonText}>Sign In</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.signInButton} onPress={handleSignOut}>
          <Text style={styles.signInButtonText}>Sign Out</Text>
        </Pressable>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Watch History</Text>
        <Text style={styles.cardText}>Continue watching</Text>
        {!session ? (
          <Pressable style={styles.cardAction} onPress={() => router.push('/login')}>
            <Text style={styles.cardActionText}>Sign In</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Content</Text>
        <Pressable style={styles.row} onPress={() => router.push('/library')}>
          <View style={styles.rowLeft}>
            <Ionicons name="list" size={16} color={funboxColors.muted} />
            <Text style={styles.rowText}>My list</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={funboxColors.muted} />
        </Pressable>
        <Pressable style={styles.row} onPress={() => router.push('/download')}>
          <View style={styles.rowLeft}>
            <Ionicons name="download" size={16} color={funboxColors.muted} />
            <Text style={styles.rowText}>Download</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={funboxColors.muted} />
        </Pressable>
        <Pressable style={styles.row} onPress={() => router.push('/subscribe')}>
          <View style={styles.rowLeft}>
            <Ionicons name="pricetag" size={16} color={funboxColors.muted} />
            <Text style={styles.rowText}>View Plans</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={funboxColors.muted} />
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Preferences</Text>
        <Pressable style={styles.row} onPress={() => router.push('/settings')}>
          <View style={styles.rowLeft}>
            <Ionicons name="settings" size={16} color={funboxColors.muted} />
            <Text style={styles.rowText}>Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={funboxColors.muted} />
        </Pressable>
        <Pressable style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="help-circle" size={16} color={funboxColors.muted} />
            <Text style={styles.rowText}>Help</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={funboxColors.muted} />
        </Pressable>
      </View>
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
    paddingTop: 24,
    paddingBottom: 120,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: funboxColors.text,
    fontSize: 18,
    fontFamily: funboxTypography.movieTitle.fontFamily,
  },
  headerSub: {
    color: funboxColors.muted,
    ...funboxTypography.body,
  },
  signInButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#2563eb',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  signInButtonText: {
    color: '#fff',
    ...funboxTypography.button,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  cardTitle: {
    color: funboxColors.text,
    fontFamily: funboxTypography.movieTitle.fontFamily,
    fontSize: 14,
  },
  cardText: {
    color: funboxColors.muted,
    ...funboxTypography.body,
  },
  cardAction: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  cardActionText: {
    color: '#fff',
    ...funboxTypography.button,
  },
  row: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowText: {
    color: funboxColors.text,
    fontFamily: funboxTypography.body.fontFamily,
  },
});
