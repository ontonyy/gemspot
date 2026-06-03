import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../infra/prisma/prisma.service'
import type { CategoryId, GuideDto, PlaceCardDto } from '../../contracts/dto/place.dto'
import { PLACE_INCLUDE, toCard, type PlaceWithRelations } from '../places/place.mapper'

const FREE_GUIDE_ID = 'free-to-play'

/* Mirrors buildGuides() in the mock: one guide per category with >=2 spots,
   plus a "Free to play" cross-cut prepended. Derived from the place set. */
@Injectable()
export class GuidesService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadPlaces(): Promise<PlaceWithRelations[]> {
    return this.prisma.place.findMany({ include: PLACE_INCLUDE, orderBy: { sort: 'asc' } })
  }

  private catId(p: PlaceWithRelations): CategoryId {
    const link = p.categories.find((pc) => pc.primary) ?? p.categories[0]
    return link.category.id as CategoryId
  }

  private async build(): Promise<{ guides: GuideDto[]; places: PlaceWithRelations[] }> {
    const [cats, places] = await Promise.all([
      this.prisma.category.findMany({ orderBy: { sort: 'asc' } }),
      this.loadPlaces(),
    ])

    const byCat: GuideDto[] = cats
      .map((c) => {
        const slugs = places.filter((p) => this.catId(p) === c.id).map((p) => p.slug)
        return {
          id: `cat-${c.id}`,
          title: c.label,
          subtitle: `Every ${c.short.toLowerCase()} spot in the field guide`,
          coverCategory: c.id as CategoryId,
          count: slugs.length,
          spotSlugs: slugs,
        }
      })
      .filter((g) => g.count >= 2)

    const freeSlugs = places.filter((p) => p.isFree).map((p) => p.slug)
    const free: GuideDto = {
      id: FREE_GUIDE_ID,
      title: 'Free to play',
      subtitle: 'No booking, no fee — just show up',
      coverCategory: 'scenic',
      count: freeSlugs.length,
      spotSlugs: freeSlugs,
    }

    return { guides: [free, ...byCat], places }
  }

  async list(): Promise<GuideDto[]> {
    return (await this.build()).guides
  }

  async getById(id: string): Promise<{ guide: GuideDto; spots: PlaceCardDto[] }> {
    const { guides, places } = await this.build()
    const guide = guides.find((g) => g.id === id)
    if (!guide) throw new NotFoundException(`guide not found: ${id}`)
    const bySlug = new Map(places.map((p) => [p.slug, p]))
    const spots = guide.spotSlugs
      .map((s) => bySlug.get(s))
      .filter((p): p is PlaceWithRelations => !!p)
      .map(toCard)
    return { guide, spots }
  }
}
