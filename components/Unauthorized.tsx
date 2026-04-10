import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { funboxColors } from '@/constants/funbox-theme';
import { funboxFonts, funboxTypography } from '@/constants/funbox-typography';

export function Unauthorized() {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>You are not signed in</Text>
      <Text style={styles.body}>Sign in to access this page.</Text>
      <Pressable style={styles.button} onPress={() => router.push('/login')}>
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#1b1b1b',
    borderWidth: 1,
    borderColor: funboxColors.border,
    gap: 10,
  },
  title: {
    color: funboxColors.accent,
    fontSize: 20,
    fontFamily: funboxFonts.bodyBold,
  },
  body: {
    color: funboxColors.text,
    ...funboxTypography.body,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  buttonText: {
    color: '#fff',
    ...funboxTypography.button,
  },
});
