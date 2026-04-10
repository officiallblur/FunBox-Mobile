import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { funboxColors } from '@/constants/funbox-theme';
import { funboxFonts, funboxTypography } from '@/constants/funbox-typography';
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const client = requireSupabase();
      const { data, error: signInError } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        throw signInError;
      }

      router.replace('/');
    } catch (signInFail: any) {
      console.error(signInFail);
      setError(signInFail?.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <View style={styles.glowOne} />
        <View style={styles.glowTwo} />
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.sub}>Sign in to continue</Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={funboxColors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={funboxColors.muted}
          secureTextEntry
        />

        <View style={styles.controls}>
          <Pressable style={styles.primaryButton} onPress={handleSignIn} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Sign in</Text>}
          </Pressable>
          <Pressable style={styles.ghostButton} onPress={() => router.push('/signup')}>
            <Text style={styles.ghostText}>Create account</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: funboxColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    padding: 28,
    gap: 10,
    overflow: 'hidden',
  },
  glowOne: {
    position: 'absolute',
    width: 280,
    height: 280,
    right: -60,
    top: -80,
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.14)',
  },
  glowTwo: {
    position: 'absolute',
    width: 220,
    height: 220,
    right: -10,
    top: -30,
    borderRadius: 999,
    backgroundColor: 'rgba(96,165,250,0.1)',
  },
  title: {
    color: funboxColors.accent,
    fontSize: 30,
    fontFamily: funboxFonts.uiBold,
    marginBottom: 6,
  },
  sub: {
    color: funboxColors.muted,
    marginBottom: 16,
    ...funboxTypography.body,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    backgroundColor: '#071021',
    color: funboxColors.text,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 12,
    ...funboxTypography.searchInput,
    fontSize: 16,
  },
  controls: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: '#60a5fa',
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#071021',
    ...funboxTypography.button,
  },
  ghostButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    color: funboxColors.muted,
    ...funboxTypography.button,
  },
  error: {
    color: '#fb7185',
    marginTop: 4,
    ...funboxTypography.body,
  },
});
