import { Movie } from '@/types/Movie';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width;
const SLIDER_HEIGHT = width * 1.2; // Tăng chiều cao lên nhiều hơn

interface MovieSliderProps {
  movies: Movie[];
  onPressMovie?: (movie: Movie) => void;
  onPressPlay?: (movie: Movie) => void;
}

export function MovieSlider({ movies, onPressMovie, onPressPlay }: MovieSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (movies.length > 0) {
        const nextIndex = (activeIndex + 1) % Math.min(movies.length, 5);
        setActiveIndex(nextIndex);
        scrollViewRef.current?.scrollTo({
          x: nextIndex * SLIDER_WIDTH,
          animated: true,
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeIndex, movies.length]);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / SLIDER_WIDTH);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  if (movies.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {movies.slice(0, 5).map((movie, index) => (
          <View key={movie.id} style={styles.slide}>
            <Pressable
              style={styles.slideContent}
              onPress={() => onPressMovie?.(movie)}
            >
              <Image
                source={{ uri: movie.thumb_url }}
                style={styles.image}
                contentFit="cover"
                contentPosition="center"
              />
              
              <LinearGradient
                colors={[
                  'transparent',
                  'rgba(21,23,24,0.1)',
                  'rgba(21,23,24,0.5)',
                  'rgba(21,23,24,0.8)',
                  '#151718',
                ]}
                locations={[0, 0.5, 0.7, 0.85, 1]}
                style={styles.gradient}
              />

              {/* Content for each slide */}
              <View style={styles.contentOverlay}>
                <View style={styles.info}>
                  {/* Badges */}
                  <View style={styles.badges}>
                    {movie.quality && (
                      <View style={styles.qualityBadge}>
                        <Text style={styles.qualityText}>{movie.quality}</Text>
                      </View>
                    )}
                    {movie.status && (
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{movie.status}</Text>
                      </View>
                    )}
                  </View>

                  {/* Title */}
                  <Text style={styles.title} numberOfLines={2}>
                    {movie.name}
                  </Text>

                  {/* Meta Info */}
                  <View style={styles.metaContainer}>
                    {movie.time && (
                      <View style={styles.metaItem}>
                        <IconSymbol name="clock" size={14} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.metaText}>{movie.time}</Text>
                      </View>
                    )}
                    {movie.categories && movie.categories.length > 0 && (
                      <View style={styles.metaItem}>
                        <IconSymbol name="tag" size={14} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.metaText}>
                          {movie.categories.slice(0, 2).map(c => c.name).join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Description */}
                  {movie.content && (
                    <Text style={styles.description} numberOfLines={3}>
                      {movie.content.replace(/<[^>]*>/g, '')}
                    </Text>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.actions}>
                    <Pressable 
                      style={styles.playButton}
                      onPress={() => {
                        onPressPlay?.(movie);
                      }}
                    >
                      <IconSymbol name="play.fill" size={18} color="#000" />
                      <Text style={styles.playButtonText}>Phát ngay</Text>
                    </Pressable>
                    
                    <Pressable 
                      style={styles.infoButton}
                      onPress={() => {
                        onPressMovie?.(movie);
                      }}
                    >
                      <IconSymbol name="info.circle" size={18} color="#fff" />
                      <Text style={styles.infoButtonText}>Chi tiết</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {movies.slice(0, 5).map((_, index) => (
          <Pressable
            key={index}
            onPress={() => {
              setActiveIndex(index);
              scrollViewRef.current?.scrollTo({
                x: index * SLIDER_WIDTH,
                animated: true,
              });
            }}
          >
            <View
              style={[
                styles.dot,
                index === activeIndex && styles.dotActive,
              ]}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: SLIDER_HEIGHT,
    marginBottom: 24,
    position: 'relative',
  },
  slide: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    position: 'relative',
  },
  slideContent: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 60,
  },
  info: {
    maxWidth: '100%',
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  qualityBadge: {
    backgroundColor: '#e50914',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  qualityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: -0.5,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  playButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(109,109,110,0.7)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  infoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#e50914',
    width: 28,
  },
});
