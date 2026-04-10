import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator, useWindowDimensions } from 'react-native';

import { MovieCard } from '@/components/movie-card';
import { funboxColors } from '@/constants/funbox-theme';
import { funboxTypography } from '@/constants/funbox-typography';
import { fetchByGenre, fetchPopularMovies, fetchPopularTv } from '@/lib/tmdb';
import { useRouter } from 'expo-router';

const TOP_SEGMENTS = ['TV Series', 'Shorts', 'Movie', 'Anime', 'Variety'];
const REGIONS = ['All regions', 'America', 'Korea', 'U.K', 'Japan', 'Thailand'];
const CATEGORIES = ['All Categories', 'Romance', 'Action', 'Fantasy', 'Anime'];
const PERIODS = ['All Time Periods', '2026', '2025', '2024', '2023'];
const SORTS = ['Popularity', 'Recent', 'High Rating'];

export default function LibraryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [activeSegment, setActiveSegment] = useState('TV Series');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  const columns = width < 480 ? 3 : width < 900 ? 4 : 6;
  const gap = 12;
  const cardWidth = Math.floor((width - 32 - gap * (columns - 1)) / columns);
  const cardHeight = Math.floor(cardWidth * 1.5);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (activeSegment === 'Movie') {
          const data = await fetchPopularMovies();
          setItems(data.results ?? []);
        } else if (activeSegment === 'Anime') {
          const data = await fetchByGenre({ mediaType: 'tv', genreId: 16 });
          setItems(data.results ?? []);
        } else {
          const data = await fetchPopularTv();
          setItems(data.results ?? []);
        }
      } catch (error) {
        console.error(error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeSegment]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.segmentRow}>
        {TOP_SEGMENTS.map((segment) => {
          const active = segment === activeSegment;
          return (
            <Pressable key={segment} onPress={() => setActiveSegment(segment)}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{segment}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {REGIONS.map((item) => (
          <View key={item} style={styles.filterChip}>
            <Text style={styles.filterChipText}>{item}</Text>
          </View>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {CATEGORIES.map((item) => (
          <View key={item} style={styles.filterChip}>
            <Text style={styles.filterChipText}>{item}</Text>
          </View>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {PERIODS.map((item) => (
          <View key={item} style={styles.filterChip}>
            <Text style={styles.filterChipText}>{item}</Text>
          </View>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {SORTS.map((item) => (
          <View key={item} style={styles.filterChip}>
            <Text style={styles.filterChipText}>{item}</Text>
          </View>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <View style={[styles.grid, { gap }]}>
          {items.map((item) => (
            <MovieCard
              key={`lib-${item.id}`}
              movie={item}
              style={{ width: cardWidth, height: cardHeight }}
              onPress={() => router.push(`/movie/${item.id}` as any)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: funboxColors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 12,
  },
  segmentText: {
    color: funboxColors.muted,
    fontSize: 14,
    fontFamily: funboxTypography.body.fontFamily,
  },
  segmentTextActive: {
    color: funboxColors.text,
    borderBottomWidth: 2,
    borderBottomColor: funboxColors.accent,
    paddingBottom: 4,
  },
  filterRow: {
    gap: 10,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipText: {
    color: funboxColors.muted,
    fontSize: 12,
    fontFamily: funboxTypography.body.fontFamily,
  },
  center: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
});
