import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Platform,
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
import { fetchActorDetails, fetchActorMovieCredits, tmdbImage } from '@/lib/tmdb';

const posterShadow = Platform.select({
  web: { boxShadow: '0px 18px 40px rgba(0, 0, 0, 0.45)' },
  ios: { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  android: { elevation: 8 },
});

export default function ActorDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [actor, setActor] = useState<any>(null);
  const [knownFor, setKnownFor] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const compact = width <= 992;
  const tiny = width <= 600;
  const imageWidth = tiny ? 200 : compact ? 250 : 320;

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    try {
      const [actorData, creditsData] = await Promise.all([
        fetchActorDetails(id as string),
        fetchActorMovieCredits(id as string),
      ]);
      setActor(actorData);
      setKnownFor(creditsData?.cast ?? []);
    } catch (error) {
      console.error(error);
      setActor(null);
      setKnownFor([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!actor) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Actor not found.</Text>
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

      <View style={styles.actorPage}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <Image
            source={{ uri: tmdbImage(actor.profile_path) }}
            style={[styles.poster, { width: imageWidth, height: imageWidth * 1.5 }]}
            contentFit="cover"
          />
          <View style={[styles.info, compact && styles.infoCompact]}>
            <FunboxHeading style={styles.name}>{actor.name}</FunboxHeading>
            <Text style={styles.line}>Born: {actor.birthday || 'N/A'}</Text>
            <Text style={styles.line}>Place of Birth: {actor.place_of_birth || 'N/A'}</Text>
            <Text style={styles.line}>Known For: {actor.known_for_department || 'N/A'}</Text>
            <Text style={styles.line}>
              Popularity: {typeof actor.popularity === 'number' ? actor.popularity.toFixed(1) : 'N/A'}
            </Text>
            {actor.deathday ? <Text style={styles.line}>Died: {actor.deathday}</Text> : null}
            {actor.biography ? <Text style={styles.bio}>{actor.biography}</Text> : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Known For</Text>
          <View style={styles.grid}>
            {knownFor.length > 0 ? (
              knownFor.map((movie) => (
                <Pressable key={movie.id} style={styles.card} onPress={() => router.push(`/movie/${movie.id}` as any)}>
                  <Image source={{ uri: tmdbImage(movie.poster_path, 'w300') }} style={styles.cardImage} contentFit="cover" />
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {movie.title}
                  </Text>
                  {movie.character ? (
                    <Text style={styles.cardSub} numberOfLines={1}>
                      as {movie.character}
                    </Text>
                  ) : null}
                </Pressable>
              ))
            ) : (
              <Text style={styles.empty}>No movies found for this actor.</Text>
            )}
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
  actorPage: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 30,
    padding: 20,
    backgroundColor: '#1b1b1b',
    borderRadius: 12,
    marginBottom: 30,
    alignItems: 'flex-start',
  },
  headerCompact: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  poster: {
    borderRadius: 10,
    backgroundColor: '#000',
    ...(posterShadow ?? {}),
  },
  info: {
    flex: 1,
    gap: 6,
  },
  infoCompact: {
    alignItems: 'center',
  },
  name: {
    color: funboxColors.accent,
    fontSize: 32,
  },
  line: {
    color: funboxColors.text,
    fontSize: 16,
    fontFamily: funboxFonts.body,
  },
  bio: {
    color: '#ddd',
    marginTop: 20,
    lineHeight: 26,
    fontFamily: funboxFonts.body,
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
    maxWidth: 240,
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  cardImage: {
    width: '100%',
    height: 240,
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
    marginTop: 2,
    fontSize: 12,
    fontFamily: funboxFonts.body,
  },
  empty: {
    color: funboxColors.muted,
    ...funboxTypography.body,
  },
});
