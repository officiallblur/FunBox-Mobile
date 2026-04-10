import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { funboxColors } from '@/constants/funbox-theme';
import { funboxFonts, funboxTypography } from '@/constants/funbox-typography';
import { useAuth } from '@/src/context/AuthProvider';

export default function SettingsScreen() {
  const router = useRouter();
  const { session } = useAuth();

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

      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Manage your Funbox preferences.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Account</Text>
        <Text style={styles.value}>{session?.user?.email ?? 'Not signed in'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Playback</Text>
        <Text style={styles.value}>Autoplay previews: On</Text>
        <Text style={styles.value}>Data saver: Off</Text>
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
    paddingHorizontal: 22,
    paddingTop: 40,
    paddingBottom: 40,
    gap: 16,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  title: {
    color: funboxColors.accent,
    fontSize: 28,
    fontFamily: funboxFonts.bodyBold,
  },
  subtitle: {
    color: funboxColors.muted,
    ...funboxTypography.body,
  },
  card: {
    borderWidth: 1,
    borderColor: funboxColors.border,
    borderRadius: 14,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    gap: 6,
  },
  label: {
    color: funboxColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 11,
    fontFamily: funboxFonts.body,
  },
  value: {
    color: funboxColors.text,
    fontFamily: funboxFonts.body,
  },
});
