import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ScrollView,
} from 'react-native';

import { Footer } from '@/components/Footer';
import { FunboxHeading } from '@/components/funbox-heading';
import { funboxColors } from '@/constants/funbox-theme';
import { funboxFonts, funboxTypography } from '@/constants/funbox-typography';
import {
  fetchTrailerId,
  fetchTvCredits,
  fetchTvDetails,
  fetchTvRecommendations,
  tmdbImage,
} from '@/lib/tmdb';

const posterShadow = Platform.select({
  web: { boxShadow: '0px 18px 40px rgba(0, 0, 0, 0.45)' },
  ios: { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  android: { elevation: 8 },
});

export default function TvDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [tv, setTv] = useState<any>(null);
  const [cast, setCast] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [trailerId, setTrailerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const compact = width <= 992;
  const tiny = width <= 600;
  const posterSize = tiny ? 200 : compact ? 250 : 300;

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    try {
      const [tvData, castData, recData] = await Promise.all([
        fetchTvDetails(id as string),
        fetchTvCredits(id as string),
        fetchTvRecommendations(id as string),
      ]);
      setTv(tvData);
      setCast((castData?.cast ?? []).slice(0, 10));
      setRecommendations((recData?.results ?? []).slice(0, 10));
    } catch (error) {
      console.error(error);
      setTv(null);
      setCast([]);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!tv?.name) {
      return;
    }
    fetchTrailerId(tv.name).then(setTrailerId).catch(() => setTrailerId(null));
  }, [tv]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!tv) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>TV show not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.nav}>
        <Pressable style={styles.navButton} onPress={() => router.back()}>
          <Text style={styles.navText}>Back</Text>
        </Pressable>
        <Pressable style={styles.navButton} onPress={() => router.push('/')}>
          <Text style={styles.navText}>Home</Text>
        </Pressable>
      </View>

      <View style={styles.detailsPage}>
        <View style={styles.banner}>
          <Image
            source={{ uri: tmdbImage(tv.backdrop_path, 'original') }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
          <View style={[styles.overlay, compact && styles.overlayCompact]}>
            <Image
              source={{ uri: tmdbImage(tv.poster_path) }}
              style={[styles.poster, { width: posterSize, height: posterSize * 1.5 }, compact && styles.posterCompact]}
              contentFit="cover"
            />
            <View style={[styles.info, compact && styles.infoCompact]}>
              <FunboxHeading style={styles.title}>{tv.name}</FunboxHeading>
              <Text style={styles.line}>First Air Date: {tv.first_air_date || 'N/A'}</Text>
              <Text style={styles.line}>Rating: {tv.vote_average?.toFixed(1) || 'N/A'} / 10</Text>
              <Text style={styles.line}>Seasons: {tv.number_of_seasons || 'N/A'}</Text>
              <Text style={styles.line}>Episodes: {tv.number_of_episodes || 'N/A'}</Text>
              <Text style={styles.line}>Language: {tv.original_language?.toUpperCase() || 'N/A'}</Text>
              <Text style={styles.line}>Genres: {tv.genres?.map((g: any) => g.name).join(', ') || 'N/A'}</Text>
              <Text style={styles.overview}>{tv.overview || 'No overview available.'}</Text>
              {trailerId ? (
                <Pressable
                  style={styles.trailerButton}
                  onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${trailerId}`)}>
                  <Text style={styles.trailerButtonText}>Open Official Trailer</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Cast</Text>
          <View style={styles.grid}>
          {cast.map((actor) => (
            <Pressable key={actor.id} style={styles.card} onPress={() => router.push(`/actor/${actor.id}` as any)}>
              <Image source={{ uri: tmdbImage(actor.profile_path, 'w300') }} style={styles.cardImage} contentFit="cover" />
              <Text style={styles.cardTitle} numberOfLines={1}>
                {actor.name}
              </Text>
              <Text style={styles.cardSub} numberOfLines={1}>
                {actor.character}
              </Text>
            </Pressable>
          ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Related TV Shows</Text>
          <View style={styles.grid}>
          {recommendations.map((show) => (
            <Pressable key={show.id} style={styles.card} onPress={() => router.push(`/tv/${show.id}` as any)}>
              <Image source={{ uri: tmdbImage(show.poster_path, 'w300') }} style={styles.cardImage} contentFit="cover" />
              <Text style={styles.cardTitle} numberOfLines={2}>
                {show.name}
              </Text>
            </Pressable>
          ))}
          </View>
        </View>
      </View>

      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: funboxColors.background,
  },
  pageContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    backgroundColor: funboxColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#fca5a5',
    ...funboxTypography.body,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    borderWidth: 1,
    borderColor: funboxColors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  navText: {
    color: funboxColors.text,
    ...funboxTypography.link,
  },
  detailsPage: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
    padding: 20,
  },
  banner: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  overlay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 30,
  },
  overlayCompact: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  poster: {
    borderRadius: 10,
    backgroundColor: '#000',
    ...(posterShadow ?? {}),
  },
  posterCompact: {
    marginBottom: 20,
  },
  info: {
    flex: 1,
    marginLeft: 30,
    gap: 6,
  },
  infoCompact: {
    marginLeft: 0,
    alignItems: 'center',
  },
  title: {
    marginBottom: 4,
    fontSize: 32,
  },
  line: {
    color: funboxColors.text,
    fontSize: 16,
    fontFamily: funboxFonts.body,
  },
  overview: {
    color: '#d4d4d4',
    marginTop: 15,
    lineHeight: 26,
    fontFamily: funboxFonts.body,
  },
  trailerButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#e11d48',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  trailerButtonText: {
    color: '#fff',
    ...funboxTypography.button,
  },
  section: {
    marginTop: 40,
  },
  sectionTitle: {
    color: funboxColors.accent,
    fontSize: 29,
    fontFamily: funboxFonts.bodyBold,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  card: {
    width: 150,
    flexGrow: 1,
    maxWidth: 220,
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  cardImage: {
    width: '100%',
    height: 210,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#000',
  },
  cardTitle: {
    color: funboxColors.text,
    fontSize: 13,
    fontFamily: funboxFonts.bodyBold,
  },
  cardSub: {
    color: funboxColors.muted,
    fontSize: 12,
    marginTop: 2,
    fontFamily: funboxFonts.body,
  },
});
