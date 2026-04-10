export const funboxFonts = {
  bodyThin: 'RobotoSlab_100Thin',
  bodyLight: 'RobotoSlab_300Light',
  body: 'RobotoSlab_400Regular',
  bodyBold: 'RobotoSlab_700Bold',
  uiLight: 'Raleway_300Light',
  ui: 'Raleway_400Regular',
  uiMedium: 'Raleway_500Medium',
  uiSemiBold: 'Raleway_600SemiBold',
  uiBold: 'Raleway_700Bold',
  uiExtraBold: 'Raleway_800ExtraBold',
  uiBlack: 'Raleway_900Black',
} as const;

export const funboxTypography = {
  body: {
    fontFamily: funboxFonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  h1: {
    fontFamily: funboxFonts.bodyBold,
    fontSize: 48, // 3rem
    lineHeight: 54,
    letterSpacing: 0.9,
  },
  button: {
    fontFamily: funboxFonts.uiBold,
    fontSize: 14,
  },
  link: {
    fontFamily: funboxFonts.uiMedium,
    fontSize: 14,
  },
  searchInput: {
    fontFamily: funboxFonts.uiMedium,
    fontSize: 21, // 1.3rem
  },
  movieLabel: {
    fontFamily: funboxFonts.uiMedium,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  movieTitle: {
    fontFamily: funboxFonts.body,
    fontSize: 16,
  },
} as const;
