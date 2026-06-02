/* TanStack Query hooks wrapping the mock placesApi seam. Call sites stay
   backend-agnostic; only placesApi changes when the real client lands. */

import { QueryClient, useQuery } from '@tanstack/react-query'
import type { CategoryId } from '../../entities/place/categories'
import { placesApi } from './placesApi'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
  },
})

export const placeKeys = {
  all: ['places'] as const,
  list: (cat?: CategoryId) => ['places', { cat: cat ?? null }] as const,
  detail: (slug: string) => ['place', slug] as const,
  categories: ['categories'] as const,
}

export function usePlaces(cat?: CategoryId) {
  return useQuery({
    queryKey: placeKeys.list(cat),
    queryFn: () => placesApi.getPlaces(cat ? { cat } : undefined),
  })
}

export function usePlace(slug: string | null) {
  return useQuery({
    queryKey: placeKeys.detail(slug ?? ''),
    queryFn: () => placesApi.getPlace(slug as string),
    enabled: !!slug,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: placeKeys.categories,
    queryFn: () => placesApi.getCategories(),
    staleTime: Infinity,
  })
}
