import { useInfiniteQuery } from '@tanstack/react-query';

import { moviesInfiniteListOptions } from '../queries';

export function useMoviesList() {
  return useInfiniteQuery(moviesInfiniteListOptions());
}
