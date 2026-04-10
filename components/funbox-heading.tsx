import { Platform, StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

import { funboxColors } from '@/constants/funbox-theme';
import { funboxTypography } from '@/constants/funbox-typography';

type FunboxHeadingProps = {
  children: string;
  style?: StyleProp<TextStyle>;
};

export function FunboxHeading({ children, style }: FunboxHeadingProps) {
  if (Platform.OS === 'web') {
    return <Text style={[styles.base, styles.webGradient, webGradientStyle, style]}>{children}</Text>;
  }

  return <Text style={[styles.base, styles.nativeColor, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  base: {
    ...funboxTypography.h1,
  },
  nativeColor: {
    color: funboxColors.accent,
  },
  webGradient: {
    color: 'transparent',
  },
});

const webGradientStyle: TextStyle = {
  backgroundImage: 'linear-gradient(90deg, #f9d3b4 0%, rgba(249,211,180,0) 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
} as TextStyle;
