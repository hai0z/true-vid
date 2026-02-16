// New API Response Types
export interface NewApiRoot {
  data: NewApiMovie[];
  links: NewApiLinks;
  meta: NewApiMeta;
  status: string;
}

export interface NewApiMovie {
  code: string;
  duration: string;
  quality: string;
  thumbnail: string;
  publish_at: string;
  updated_at: string;
  trans: NewApiTran[];
  genres: NewApiGenre[];
  countries: NewApiCountry[];
  actors: NewApiActor[];
  keywords: NewApiKeyword[];
  images: NewApiImage[];
  sources: NewApiSource[];
}

export interface NewApiTran {
  locale: string;
  title: string;
  slug: string;
  content: string;
  description: any;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  updated_at: string;
}

export interface NewApiGenre {
  code: string;
  thumbnail: string;
  updated_at: string;
  trans: NewApiGenreTran[];
}

export interface NewApiGenreTran {
  locale: string;
  name: string;
  description: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  updated_at: string;
}

export interface NewApiCountry {
  code: string;
  flag: string;
  updated_at: string;
  trans: NewApiCountryTran[];
}

export interface NewApiCountryTran {
  locale: string;
  name: string;
  slug: string;
  description: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  updated_at: string;
}

export interface NewApiActor {
  gender: number;
  avatar: string;
  birth_date: any;
  status: string;
  updated_at: string;
  trans: NewApiActorTran[];
}

export interface NewApiActorTran {
  locale: string;
  name: string;
  biography: any;
  seo_title: string;
  seo_description: any;
  seo_keywords: any;
}

export interface NewApiKeyword {
  code: string;
  status: string;
  updated_at: string;
  trans: NewApiKeywordTran[];
}

export interface NewApiKeywordTran {
  locale: string;
  name: string;
  slug: string;
  description: any;
  updated_at: string;
}

export interface NewApiImage {
  path: string;
}

export interface NewApiSource {
  link: string;
  type: string;
  updated_at: string;
}

export interface NewApiLinks {
  first: string;
  last: string;
  prev: any;
  next: string;
}

export interface NewApiMeta {
  current_page: number;
  from: number;
  last_page: number;
  links: NewApiMetaLink[];
  path: string;
  per_page: number;
  to: number;
  total: number;
}

export interface NewApiMetaLink {
  url?: string;
  label: string;
  active: boolean;
}

// Old API Types (from Movie.ts)
import { ApiResponse, Movie, MovieDetail } from '@/types/Movie';

/**
 * Convert new API movie to old Movie format
 */
export function convertNewApiMovieToMovie(newMovie: NewApiMovie, locale: string = 'vi'): Movie {
  // Get translation for specified locale (default: vi)
  const trans = newMovie.trans.find(t => t.locale === locale) || newMovie.trans[0];
  
  // Convert genres to categories
  const categories = newMovie.genres.map(genre => {
    const genreTrans = genre.trans.find(t => t.locale === locale) || genre.trans[0];
    return {
      id: genre.code,
      name: genreTrans.name,
      slug: genreTrans.name.toLowerCase().replace(/\s+/g, '-'),
    };
  });

  // Get country
  const countryData = newMovie.countries[0];
  const countryTrans = countryData?.trans.find(t => t.locale === locale) || countryData?.trans[0];
  const country = countryData ? {
    id: countryData.code,
    name: countryTrans.name,
    slug: countryTrans.slug,
  } : { id: '', name: '', slug: '' };

  // Get actor names
  const actors = newMovie.actors.map(actor => {
    const actorTrans = actor.trans.find(t => t.locale === locale) || actor.trans[0];
    return actorTrans.name;
  });

  // Convert sources to episodes
  const episodes = newMovie.sources.length > 0 ? [
    {
      server_name: 'Server 1',
      server_data: newMovie.sources.map((source, index) => ({
        name: `Tập ${index + 1}`,
        slug: newMovie.code,
        link: source.link,
      })),
    },
  ] : [];

  return {
    id: newMovie.code,
    name: trans.title,
    slug: newMovie.code, // Use code directly as slug
    content: trans.content || '',
    type: 'single',
    status: 'completed',
    thumb_url: newMovie.images[3].path,
    time: newMovie.duration,
    quality: newMovie.quality,
    lang: null,
    actors,
    categories,
    country,
    episodes,
  };
}

/**
 * Convert new API response to old ApiResponse format
 */
export function convertNewApiResponseToApiResponse(
  newApiResponse: NewApiRoot,
  locale: string = 'vi'
): ApiResponse {
  const movies = newApiResponse.data.map(movie => convertNewApiMovieToMovie(movie, locale));

  return {
    status: newApiResponse.status === 'success',
    msg: 'Success',
    movies,
    page: {
      current_page: newApiResponse.meta.current_page,
      from: newApiResponse.meta.from,
      to: newApiResponse.meta.to,
      total: newApiResponse.meta.total,
      per_page: newApiResponse.meta.per_page,
      last_page: newApiResponse.meta.last_page,
    },
  };
}

/**
 * Convert single new API movie to MovieDetail format
 */
export function convertNewApiMovieToMovieDetail(
  newMovie: NewApiMovie,
  locale: string = 'vi'
): MovieDetail {
  return {
    status: true,
    msg: 'Success',
    movie: convertNewApiMovieToMovie(newMovie, locale),
  };
}
