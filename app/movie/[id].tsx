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

import { DownloadLinks } from '@/components/DownloadLinks';
import { Footer } from '@/components/Footer';
import { FunboxHeading } from '@/components/funbox-heading';
import { funboxColors } from '@/constants/funbox-theme';
import { funboxFonts, funboxTypography } from '@/constants/funbox-typography';
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';
import {
  fetchMovieCredits,
  fetchMovieDetails,
  fetchMovieRecommendations,
  fetchTrailerId,
  tmdbImage,
} from '@/lib/tmdb';

const posterShadow = Platform.select({
  web: { boxShadow: '0px 18px 40px rgba(0, 0, 0, 0.45)' },
  ios: { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  android: { elevation: 8 },
});

export default function MovieDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [movie, setMovie] = useState<any>(null);
  const [cast, setCast] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [trailerId, setTrailerId] = useState<string | null>(null);
  const [entitlements, setEntitlements] = useState<any | null>(null);
  const [showAllCast, setShowAllCast] = useState(false);
  const [loading, setLoading] = useState(true);
  const compact = width <= 992;
  const tiny = width <= 600;
  const posterSize = tiny ? 200 : compact ? 250 : 300;
  const visibleCast = showAllCast ? cast : [];
  const hasCast = cast.length > 0;
  const canStream = !isSupabaseConfigured || entitlements?.can_stream;

  const loadEntitlements = async () => {
    if (!isSupabaseConfigured) {
      setEntitlements({ can_stream: true, max_quality: 'HD' });
      return;
    }
    try {
      const client = requireSupabase();
      const { data: sessionData } = await client.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        setEntitlements(null);
        return;
      }
      const { data: entitlement } = await client.from('entitlements').select('*').maybeSingle();
      setEntitlements(entitlement ?? null);
    } catch (error) {
      console.warn(error);
      setEntitlements(null);
    }
  };

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    try {
      const [movieData, castData, recommendationsData] = await Promise.all([
        fetchMovieDetails(id as string),
        fetchMovieCredits(id as string),
        fetchMovieRecommendations(id as string),
      ]);
      setMovie(movieData);
      setCast(castData?.cast ?? []);
      setRecommendations((recommendationsData?.results ?? []).slice(0, 10));
      loadEntitlements();
    } catch (error) {
      console.error(error);
      setMovie(null);
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
    if (!movie?.title) {
      return;
    }
    fetchTrailerId(movie.title).then(setTrailerId).catch(() => setTrailerId(null));
  }, [movie]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Movie not found.</Text>
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
            source={{ uri: tmdbImage(movie.backdrop_path, 'original') }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
          <View style={[styles.overlay, compact && styles.overlayCompact]}>
            <Image
              source={{ uri: tmdbImage(movie.poster_path) }}
              style={[styles.poster, { width: posterSize, height: posterSize * 1.5 }, compact && styles.posterCompact]}
              contentFit="cover"
            />
            <View style={[styles.info, compact && styles.infoCompact]}>
          <FunboxHeading style={styles.title}>{movie.title}</FunboxHeading>
          <Text style={styles.line}>Release Date: {movie.release_date || 'N/A'}</Text>
          <Text style={styles.line}>Rating: {movie.vote_average?.toFixed(1) || 'N/A'} / 10</Text>
          <Text style={styles.line}>Runtime: {movie.runtime || 'N/A'} min</Text>
          <Text style={styles.line}>Language: {movie.original_language?.toUpperCase() || 'N/A'}</Text>
          <Text style={styles.line}>Genres: {movie.genres?.map((g: any) => g.name).join(', ') || 'N/A'}</Text>
          <Text style={styles.overview}>{movie.overview || 'No overview available.'}</Text>

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

        {canStream ? (
          <DownloadLinks editable={false} movieId={movie.id} />
        ) : (
          <View style={styles.gate}>
            <Text style={styles.gateTitle}>Subscribe to watch</Text>
            <Text style={styles.gateText}>Pick a plan to unlock streaming and download access.</Text>
            <Pressable style={styles.gateButton} onPress={() => router.push('/subscribe')}>
              <Text style={styles.gateButtonText}>View Plans</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Cast</Text>
            {hasCast ? (
              <Pressable style={styles.sectionAction} onPress={() => setShowAllCast((prev) => !prev)}>
                <Text style={styles.sectionActionText}>
                  {showAllCast ? 'Hide Cast' : `View Top Cast (${cast.length})`}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.grid}>
          {visibleCast.map((actor) => (
            <Pressable
              key={actor.id}
              style={styles.personCard}
              onPress={() => router.push(`/actor/${actor.id}` as any)}>
              <Image source={{ uri: tmdbImage(actor.profile_path, 'w300') }} style={styles.personImage} contentFit="cover" />
              <Text style={styles.personName} numberOfLines={1}>
                {actor.name}
              </Text>
              <Text style={styles.personSub} numberOfLines={1}>
                {actor.character}
              </Text>
            </Pressable>
          ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Related Movies</Text>
          <View style={styles.grid}>
          {recommendations.map((item) => (
            <Pressable key={item.id} style={styles.relatedCard} onPress={() => router.push(`/movie/${item.id}` as any)}>
              <Image source={{ uri: tmdbImage(item.poster_path, 'w300') }} style={styles.relatedImage} contentFit="cover" />
              <Text style={styles.personName} numberOfLines={2}>
                {item.title}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    color: funboxColors.accent,
    fontSize: 29,
    fontFamily: funboxFonts.bodyBold,
  },
  sectionAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: funboxColors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  sectionActionText: {
    color: funboxColors.text,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontFamily: funboxFonts.bodyBold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  personCard: {
    width: 150,
    flexGrow: 1,
    maxWidth: 220,
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  personImage: {
    width: '100%',
    height: 210,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#000',
  },
  personName: {
    color: funboxColors.text,
    fontSize: 13,
    fontFamily: funboxFonts.bodyBold,
  },
  personSub: {
    color: funboxColors.muted,
    fontSize: 12,
    marginTop: 2,
    fontFamily: funboxFonts.body,
  },
  relatedCard: {
    width: 150,
    flexGrow: 1,
    maxWidth: 220,
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  relatedImage: {
    width: '100%',
    height: 210,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#000',
  },
  gate: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: funboxColors.border,
    borderRadius: 14,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    gap: 8,
  },
  gateTitle: {
    color: funboxColors.accent,
    fontSize: 18,
    fontFamily: funboxFonts.bodyBold,
  },
  gateText: {
    color: funboxColors.muted,
    ...funboxTypography.body,
  },
  gateButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: funboxColors.accent,
  },
  gateButtonText: {
    color: funboxColors.background,
    ...funboxTypography.button,
  },
});
