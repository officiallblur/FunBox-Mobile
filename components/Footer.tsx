import { StyleSheet, Text, View } from 'react-native';

import { funboxColors } from '@/constants/funbox-theme';
import { funboxFonts } from '@/constants/funbox-typography';

export function Footer() {
  return (
    <View style={styles.footer}>
      <Text style={styles.text}>
        (c) {new Date().getFullYear()} <Text style={styles.brand}>Funbox</Text> Created by{' '}
        <Text style={styles.brand}>Abdulrahman</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 50,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#222',
    alignItems: 'center',
    backgroundColor: '#181a1b',
  },
  text: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 0.5,
    fontFamily: funboxFonts.body,
  },
  brand: {
    color: funboxColors.accent,
    fontFamily: funboxFonts.uiBold,
  },
});
