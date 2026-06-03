/* Pure mappers: Prisma rows -> frontend DTOs. Logic mirrors the mock
   toCategoryDto / toCard / toDetail in web/src/shared/api/placesApi.ts so the
   HTTP responses are byte-identical. */

import type { Category, Place, PlaceCategory, PlacePhoto } from '@prisma/client'
import type { CategoryDto, CategoryId, PlaceCardDto, PlaceDetailDto } from '../../contracts/dto/place.dto'

export type PlaceWithRelations = Place & {
  categories: (PlaceCategory & { category: Category })[]
  photos?: PlacePhoto[]
}

export function toCategoryDto(c: Category): CategoryDto {
  return {
    id: c.id as CategoryId,
    label: c.label,
    short: c.short,
    color: c.cssvar,
    glyph: c.id,
  }
}

function primaryCategory(p: PlaceWithRelations): Category {
  const link = p.categories.find((pc) => pc.primary) ?? p.categories[0]
  return link.category
}

export function toCard(p: PlaceWithRelations): PlaceCardDto {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: toCategoryDto(primaryCategory(p)),
    neighborhood: p.neighborhood,
    savesCount: p.savesCount,
    isFree: p.isFree,
    tags: p.tags,
    lat: p.lat,
    lng: p.lng,
  }
}

export function toDetail(p: PlaceWithRelations): PlaceDetailDto {
  const q = `${p.lat},${p.lng}`
  const photos = p.photos && p.photos.length
    ? p.photos.map((ph) => ({ url: ph.url }))
    : [{ url: '' }]
  return {
    ...toCard(p),
    note: p.note,
    photos,
    viewsCount: p.viewsCount,
    sharesCount: p.sharesCount,
    contributor: { name: p.contributorName },
    verifiedAt: p.verifiedLabel,
    fieldNotes: { access: p.accessNote, lit: p.litNote, best: p.bestNote },
    appleMapsUrl: `https://maps.apple.com/?ll=${q}&q=${encodeURIComponent(p.name)}`,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${q}`,
  }
}

export const PLACE_INCLUDE = {
  categories: { include: { category: true } },
  photos: { orderBy: { sort: 'asc' as const } },
}
