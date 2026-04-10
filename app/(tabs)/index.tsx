import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { FunboxHeading } from '@/components/funbox-heading';
import { SearchIcon } from '@/components/icons/search-icon';
import { MovieCard } from '@/components/movie-card';
import { funboxColors } from '@/constants/funbox-theme';
import { funboxTypography } from '@/constants/funbox-typography';
import { useAuth } from '@/src/context/AuthProvider';
import {
  discoverMedia,
  fetchNowPlaying,
  fetchOnTheAirTv,
  fetchPopularMovies,
  fetchPopularTv,
  fetchTopRatedMovies,
  fetchTopRatedTv,
  fetchTrending,
  fetchUpcomingMovies,
  searchMulti,
  tmdbImage,
} from '@/lib/tmdb';

type TopFeatureTab = 'Home' | 'African' | 'Western TV' | 'Movie';

const TOP_TABS: TopFeatureTab[] = ['Home', 'African', 'Western TV', 'Movie'];
const AFRICAN_COUNTRIES = ['NG', 'GH', 'KE', 'ZA', 'EG'];
const TAB_SECTION_COPY: Record<
  TopFeatureTab,
  {
    heroPill: string;
    topPicksTitle: string;
    weeklyTitle: string;
    upcomingTitle: string;
    topPickTabs: string[];
  }
> = {
  Home: {
    heroPill: 'Trending Today',
    topPicksTitle: 'Top Picks',
    weeklyTitle: 'Weekly Top 20',
    upcomingTitle: 'Upcoming',
    topPickTabs: ['Global', 'Western', 'Movie', 'K-Drama', 'Anime'],
  },
  African: {
    heroPill: 'African Spotlight',
    topPicksTitle: 'African Top Picks',
    weeklyTitle: 'African TV Hits',
    upcomingTitle: 'More African Stories',
    topPickTabs: ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt'],
  },
  'Western TV': {
    heroPill: 'Western TV Highlights',
    topPicksTitle: 'Western TV Top Picks',
    weeklyTitle: 'Top Rated TV',
    upcomingTitle: 'On The Air',
    topPickTabs: ['US', 'UK', 'Crime', 'Drama', 'Sci-Fi'],
  },
  Movie: {
    heroPill: 'Movie Spotlight',
    topPicksTitle: 'Popular Movies',
    weeklyTitle: 'Top Rated Movies',
    upcomingTitle: 'Coming Soon',
    topPickTabs: ['Action', 'Drama', 'Comedy', 'Thriller', 'Family'],
  },
};
const PRIMARY_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'ranking', label: 'Ranking' },
  { key: 'updating', label: 'Updating' },
  { key: 'upcoming', label: 'Upcoming' },
];
const FILTER_TABS = ['All', 'Hottest', 'Schedule', 'Upcoming'];

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { session } = useAuth();
  const [activeTopTab, setActiveTopTab] = useState<TopFeatureTab>('Home');
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTopPick, setActiveTopPick] = useState(TAB_SECTION_COPY.Home.topPickTabs[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [heroItems, setHeroItems] = useState<any[]>([]);
  const [topPicks, setTopPicks] = useState<any[]>([]);
  const [weeklyTop, setWeeklyTop] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const pageScrollRef = useRef<ScrollView>(null);
  const heroRef = useRef<FlatList>(null);
  const searchInputRef = useRef<TextInput>(null);
  const activeSectionCopy = TAB_SECTION_COPY[activeTopTab];

  const contentWidth = Math.min(width, 920);
  const padding = width < 480 ? 16 : 20;
  const heroWidth = contentWidth - padding * 2;
  const heroHeight = width < 480 ? 300 : width < 900 ? 360 : 420;
  const cardWidth = Math.min(140, Math.max(120, Math.floor((heroWidth - 24) / 2.3)));
  const cardHeight = Math.floor(cardWidth * 1.5);
  const headerTitleSize = width < 360 ? 24 : width < 480 ? 26 : 28;
  const headerTitleLineHeight = Math.round(headerTitleSize * 1.25);
  const headerIconSize = width < 360 ? 18 : 20;
  const headerButtonSize = width < 360 ? 32 : 36;
  const headerTopPadding = width < 360 ? 6 : 8;

  useEffect(() => {
    let isMounted = true;

    const applyCollections = (collections: {
      hero: any[];
      picks: any[];
      weekly: any[];
      upcomingItems: any[];
    }) => {
      if (!isMounted) return;
      setHeroItems((collections.hero ?? []).slice(0, 6));
      setTopPicks((collections.picks ?? []).slice(0, 10));
      setWeeklyTop((collections.weekly ?? []).slice(0, 10));
      setUpcoming((collections.upcomingItems ?? []).slice(0, 10));
      setHeroIndex(0);
      heroRef.current?.scrollToOffset({ offset: 0, animated: false });
    };

    const load = async () => {
      setLoading(true);
      try {
        if (activeTopTab === 'African') {
          const [africanMovies, africanTv, africanMoviesPage2, africanTvPage2] = await Promise.all([
            discoverMedia({ mediaType: 'movie', withOriginCountry: AFRICAN_COUNTRIES, page: 1 }),
            discoverMedia({ mediaType: 'tv', withOriginCountry: AFRICAN_COUNTRIES, page: 1 }),
            discoverMedia({ mediaType: 'movie', withOriginCountry: AFRICAN_COUNTRIES, page: 2 }),
            discoverMedia({ mediaType: 'tv', withOriginCountry: AFRICAN_COUNTRIES, page: 2 }),
          ]);
          const movieResults = africanMovies?.results ?? [];
          const tvResults = africanTv?.results ?? [];
          const moreAfricanResults = africanMoviesPage2?.results?.length
            ? africanMoviesPage2.results
            : africanTvPage2?.results ?? [];

          applyCollections({
            hero: movieResults.length ? movieResults : tvResults,
            picks: movieResults,
            weekly: tvResults,
            upcomingItems: moreAfricanResults,
          });
          return;
        }

        if (activeTopTab === 'Western TV') {
          const [popularTv, topRatedTv, onTheAirTv, moreTv] = await Promise.all([
            fetchPopularTv(),
            fetchTopRatedTv(),
            fetchOnTheAirTv(),
            discoverMedia({ mediaType: 'tv', page: 2 }),
          ]);

          applyCollections({
            hero: popularTv?.results ?? [],
            picks: topRatedTv?.results ?? [],
            weekly: onTheAirTv?.results ?? [],
            upcomingItems: moreTv?.results ?? [],
          });
          return;
        }

        if (activeTopTab === 'Movie') {
          const [nowPlaying, popular, topRated, coming] = await Promise.all([
            fetchNowPlaying(),
            fetchPopularMovies(),
            fetchTopRatedMovies(),
            fetchUpcomingMovies(),
          ]);

          applyCollections({
            hero: nowPlaying?.results ?? [],
            picks: popular?.results ?? [],
            weekly: topRated?.results ?? [],
            upcomingItems: coming?.results ?? [],
          });
          return;
        }

        const [trending, popular, topRated, coming] = await Promise.all([
          fetchTrending(),
          fetchPopularMovies(),
          fetchTopRatedMovies(),
          fetchUpcomingMovies(),
        ]);

        applyCollections({
          hero: trending?.results ?? [],
          picks: popular?.results ?? [],
          weekly: topRated?.results ?? [],
          upcomingItems: coming?.results ?? [],
        });
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [activeTopTab]);

  useEffect(() => {
    const firstTab = TAB_SECTION_COPY[activeTopTab].topPickTabs[0];
    setActiveTopPick(firstTab);
  }, [activeTopTab]);

  useEffect(() => {
    if (heroItems.length <= 1 || heroWidth <= 0) return;
    let index = 0;
    const id = setInterval(() => {
      index = (index + 1) % heroItems.length;
      setHeroIndex(index);
      const offset = index * heroWidth;
      heroRef.current?.scrollToOffset({ offset, animated: true });
    }, 4500);
    return () => clearInterval(id);
  }, [heroItems.length, heroWidth]);

  const onHeroScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!heroWidth) return;
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / heroWidth);
    setHeroIndex(nextIndex);
  };

  const runSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    try {
      const data = await searchMulti(trimmed);
      setSearchResults(data.results ?? []);
    } catch (error) {
      console.error(error);
      setSearchError('Search failed.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const getDestination = (item: any) => {
    if (item?.media_type === 'person') return `/actor/${item.id}`;
    if (item?.media_type === 'tv' || item?.first_air_date) return `/tv/${item.id}`;
    return `/movie/${item.id}`;
  };

  const showSearchResults = searchTerm.trim().length > 0;

  const heroSlide = ({ item }: { item: any }) => {
    const title = item?.title || item?.name || 'Featured';
    const year = item?.release_date?.slice(0, 4) || item?.first_air_date?.slice(0, 4) || '2026';
    const mediaLabel = item?.media_type === 'tv' || item?.first_air_date ? 'TV' : 'Movie';
    return (
      <Pressable
        style={[styles.heroSlide, { width: heroWidth, height: heroHeight }]}
        onPress={() => router.push(getDestination(item) as any)}>
        <Image
          source={{ uri: tmdbImage(item.backdrop_path || item.poster_path, 'original') }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>{activeSectionCopy.heroPill}</Text>
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.heroMeta}>{`${year} | ${mediaLabel} | Premium`}</Text>
          <View style={styles.heroActions}>
            <Pressable style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Watch Now</Text>
            </Pressable>
            <Pressable style={styles.heroGhostButton}>
              <Text style={styles.heroGhostText}>View Details</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        ref={pageScrollRef}
        style={styles.page}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: padding,
            paddingBottom: 140,
            width: '100%',
            maxWidth: 920,
            alignSelf: 'center',
          },
        ]}>
        <View style={[styles.header, { paddingTop: headerTopPadding }]}>
          <View style={styles.headerLeft}>
            <FunboxHeading
              style={[styles.brand, { fontSize: headerTitleSize, lineHeight: headerTitleLineHeight }]}>
              Funbox
            </FunboxHeading>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search"
              style={[styles.iconButton, { width: headerButtonSize, height: headerButtonSize }]}
              hitSlop={8}
              onPress={() => searchInputRef.current?.focus()}>
              <SearchIcon size={headerIconSize + 4} color={funboxColors.text} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profile"
              style={[styles.iconButton, { width: headerButtonSize, height: headerButtonSize }]}
              hitSlop={8}
              onPress={() => router.push('/settings')}>
              <Ionicons name="person-circle-outline" size={headerIconSize + 6} color={funboxColors.text} />
            </Pressable>
          </View>
        </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.topTabs}>
        {TOP_TABS.map((tab) => {
          const active = tab === activeTopTab;
          return (
            <Pressable
              key={tab}
              style={[styles.topTab, active && styles.topTabActive]}
              onPress={() => {
                if (searchTerm.trim().length > 0) {
                  setSearchTerm('');
                  setSearchResults([]);
                  setSearchError(null);
                  setSearchLoading(false);
                  searchInputRef.current?.blur();
                }
                if (activeTopTab !== tab) {
                  setActiveTopTab(tab);
                }
                pageScrollRef.current?.scrollTo({ y: 0, animated: true });
              }}>
              <Text style={[styles.topTabText, active && styles.topTabTextActive]}>{tab}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.searchRow}>
        <SearchIcon size={18} color={funboxColors.muted} />
        <TextInput
          ref={searchInputRef}
          value={searchTerm}
          onChangeText={(text) => {
            setSearchTerm(text);
            runSearch(text);
          }}
          placeholder="Search movies, series, anime"
          placeholderTextColor={funboxColors.muted}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <FlatList
            ref={heroRef}
            data={heroItems}
            keyExtractor={(item) => `${item?.id}`}
            renderItem={heroSlide}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_, index) => ({
              length: heroWidth,
              offset: heroWidth * index,
              index,
            })}
            onMomentumScrollEnd={onHeroScrollEnd}
            contentContainerStyle={{ gap: 0 }}
          />
          <View style={styles.dots}>
            {heroItems.map((_, index) => (
              <View key={`dot-${index}`} style={[styles.dot, index === heroIndex && styles.dotActive]} />
            ))}
          </View>
        </>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.primaryChips}>
        {PRIMARY_CHIPS.map((chip) => (
          <View key={chip.key} style={styles.primaryChip}>
            <Text style={styles.primaryChipText}>{chip.label}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => {
          const active = tab === activeFilter;
          return (
            <Pressable key={tab} onPress={() => setActiveFilter(tab)} style={styles.filterTab}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{tab}</Text>
            </Pressable>
          );
        })}
      </View>

      {showSearchResults ? (
        <>
          {searchLoading ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          ) : searchError ? (
            <Text style={styles.error}>{searchError}</Text>
          ) : (
            <View style={styles.searchGrid}>
              {searchResults.map((item) => (
                <MovieCard
                  key={`${item?.media_type ?? 'movie'}-${item?.id}`}
                  movie={item}
                  style={{ width: cardWidth, height: cardHeight }}
                  onPress={() => router.push(getDestination(item) as any)}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{activeSectionCopy.topPicksTitle}</Text>
            <Text style={styles.sectionArrow}>›</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topPickTabs}>
            {activeSectionCopy.topPickTabs.map((tab) => {
              const active = tab === activeTopPick;
              return (
                <Pressable key={tab} onPress={() => setActiveTopPick(tab)}>
                  <Text style={[styles.topPickText, active && styles.topPickTextActive]}>{tab}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>
            {topPicks.map((item) => (
              <MovieCard
                key={`top-${item.id}`}
                movie={item}
                variant="rail"
                style={{ width: cardWidth, height: cardHeight }}
                onPress={() => router.push(getDestination(item) as any)}
              />
            ))}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{activeSectionCopy.weeklyTitle}</Text>
            <Text style={styles.sectionArrow}>›</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>
            {weeklyTop.map((item) => (
              <MovieCard
                key={`weekly-${item.id}`}
                movie={item}
                variant="rail"
                style={{ width: cardWidth, height: cardHeight }}
                onPress={() => router.push(getDestination(item) as any)}
              />
            ))}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{activeSectionCopy.upcomingTitle}</Text>
            <Text style={styles.sectionArrow}>›</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>
            {upcoming.map((item) => (
              <MovieCard
                key={`upcoming-${item.id}`}
                movie={item}
                variant="rail"
                style={{ width: cardWidth, height: cardHeight }}
                onPress={() => router.push(getDestination(item) as any)}
              />
            ))}
          </ScrollView>
        </>
      )}

      {!session ? (
        <View style={styles.signInBanner}>
          <Text style={styles.signInText}>Sign in to unlock more features</Text>
          <Pressable style={styles.signInButton} onPress={() => router.push('/login')}>
            <Text style={styles.signInButtonText}>Sign In</Text>
          </Pressable>
        </View>
      ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: funboxColors.background,
  },
  page: {
    flex: 1,
    backgroundColor: funboxColors.background,
  },
  content: {
    paddingTop: 8,
  },
  header: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  brand: {
    color: funboxColors.accent,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  topTabs: {
    gap: 16,
    paddingVertical: 8,
  },
  topTab: {
    paddingBottom: 6,
  },
  topTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: funboxColors.accent,
  },
  topTabText: {
    color: funboxColors.muted,
    fontSize: 14,
    fontFamily: funboxTypography.body.fontFamily,
  },
  topTabTextActive: {
    color: funboxColors.text,
    fontFamily: funboxTypography.body.fontFamily,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: funboxColors.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: funboxColors.text,
    ...funboxTypography.searchInput,
    paddingVertical: 2,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  heroSlide: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  heroContent: {
    flex: 1,
    padding: 18,
    justifyContent: 'flex-end',
    gap: 8,
  },
  heroPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(249,211,180,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(249,211,180,0.35)',
  },
  heroPillText: {
    color: funboxColors.accent,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontFamily: funboxTypography.body.fontFamily,
  },
  heroTitle: {
    color: funboxColors.text,
    fontSize: 22,
    fontFamily: funboxTypography.movieTitle.fontFamily,
  },
  heroMeta: {
    color: funboxColors.muted,
    fontSize: 12,
    fontFamily: funboxTypography.body.fontFamily,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  heroButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: funboxColors.accent,
  },
  heroButtonText: {
    color: funboxColors.background,
    ...funboxTypography.button,
  },
  heroGhostButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: funboxColors.border,
  },
  heroGhostText: {
    color: funboxColors.text,
    ...funboxTypography.button,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: funboxColors.accent,
    width: 16,
  },
  primaryChips: {
    gap: 10,
    marginTop: 6,
    marginBottom: 6,
  },
  primaryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  primaryChipText: {
    color: funboxColors.text,
    fontSize: 12,
    fontFamily: funboxTypography.body.fontFamily,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    marginBottom: 6,
  },
  filterTab: {
    paddingBottom: 4,
  },
  filterText: {
    color: funboxColors.muted,
    fontSize: 12,
    fontFamily: funboxTypography.body.fontFamily,
  },
  filterTextActive: {
    color: funboxColors.text,
  },
  sectionHeader: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: funboxColors.text,
    fontSize: 16,
    fontFamily: funboxTypography.movieTitle.fontFamily,
  },
  sectionArrow: {
    color: funboxColors.muted,
    fontSize: 18,
  },
  topPickTabs: {
    gap: 14,
    marginTop: 8,
  },
  topPickText: {
    color: funboxColors.muted,
    fontSize: 12,
    fontFamily: funboxTypography.body.fontFamily,
  },
  topPickTextActive: {
    color: funboxColors.text,
  },
  cardRow: {
    gap: 12,
    marginTop: 10,
  },
  searchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  error: {
    color: '#fda4af',
    ...funboxTypography.body,
  },
  signInBanner: {
    marginTop: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  signInText: {
    color: funboxColors.text,
    ...funboxTypography.body,
  },
  signInButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  signInButtonText: {
    color: '#fff',
    ...funboxTypography.button,
  },
});
