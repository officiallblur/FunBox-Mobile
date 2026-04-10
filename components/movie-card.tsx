import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { funboxColors } from '@/constants/funbox-theme';
import { funboxFonts, funboxTypography } from '@/constants/funbox-typography';
import { tmdbImage } from '@/lib/tmdb';

type MovieCardProps = {
  movie: any;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'grid' | 'rail';
};

export function MovieCard({ movie, onPress, style, variant = 'grid' }: MovieCardProps) {
  const [hovered, setHovered] = useState(false);
  const title = movie?.title || movie?.name || 'Untitled';
  const year = movie?.release_date?.slice(0, 4) || movie?.first_air_date?.slice(0, 4) || '';
  const type =
    movie?.media_type === 'person'
      ? 'Person'
      : movie?.media_type === 'tv' || movie?.first_air_date
        ? 'TV Show'
        : 'Movie';
  const posterPath = movie?.poster_path ?? movie?.profile_path;
  const isRail = variant === 'rail';

  const cardStyle = useMemo(() => [styles.card, style, hovered && styles.cardHovered], [hovered, style]);

  return (
    <Pressable
      style={cardStyle}
      onPress={onPress}
      onHoverIn={Platform.OS === 'web' ? () => setHovered(true) : undefined}
      onHoverOut={Platform.OS === 'web' ? () => setHovered(false) : undefined}>
      <View style={[styles.yearWrap, hovered && styles.yearWrapVisible]}>
        <Text style={styles.yearText}>{year}</Text>
      </View>
      <Image
        source={{ uri: tmdbImage(posterPath) }}
        style={[styles.poster, hovered && styles.posterHovered]}
        contentFit="cover"
      />
      <View style={[styles.meta, isRail && styles.metaRail, hovered && styles.metaHovered]}>
        <Text style={[styles.type, isRail && styles.typeRail]}>{type}</Text>
        <Text numberOfLines={2} style={[styles.title, isRail && styles.titleRail]}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const cardShadow = Platform.select({
  web: {
    boxShadow: '0px 18px 40px rgba(0, 0, 0, 0.45)',
  },
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  android: {
    elevation: 8,
  },
});

const styles = StyleSheet.create({
  card: {
    width: 200,
    height: 260,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: funboxColors.card,
    position: 'relative',
    transform: [{ scale: 1 }],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...(cardShadow ?? {}),
  },
  cardHovered: {
    transform: [{ scale: 1.06 }],
    borderColor: 'rgba(255,255,255,0.16)',
  },
  poster: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  posterHovered: {
    opacity: 0.3,
  },
  yearWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 16,
    width: '100%',
    opacity: 0,
    zIndex: 3,
  },
  yearWrapVisible: {
    opacity: 1,
  },
  yearText: {
    color: funboxColors.accent,
    fontFamily: funboxFonts.bodyBold,
    fontSize: 13,
  },
  meta: {
    zIndex: 2,
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    paddingTop: 16,
    paddingRight: 24,
    paddingBottom: 24,
    paddingLeft: 24,
    gap: 4,
    backgroundColor: 'rgba(31, 33, 35, 0.95)',
  },
  metaRail: {
    paddingTop: 12,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16,
  },
  metaHovered: {
    backgroundColor: 'transparent',
  },
  type: {
    color: funboxColors.text,
    ...funboxTypography.movieLabel,
  },
  typeRail: {
    fontSize: 11,
    letterSpacing: 1.2,
  },
  title: {
    color: funboxColors.accent,
    ...funboxTypography.movieTitle,
    fontSize: 18,
    marginTop: 5,
  },
  titleRail: {
    fontSize: 15,
  },
});
