import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  return useMemo(
    () => ({
      width,
      height,
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      cardColumns: width < 520 ? 2 : width < 820 ? 3 : width < 1200 ? 4 : 5,
    }),
    [width, height]
  );
}
