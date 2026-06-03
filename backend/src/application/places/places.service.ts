import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../infra/prisma/prisma.service'
import type { CategoryId, PlaceCardDto, PlaceDetailDto } from '../../contracts/dto/place.dto'
import { PLACE_INCLUDE, toCard, toDetail } from './place.mapper'

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(cat?: CategoryId): Promise<PlaceCardDto[]> {
    const rows = await this.prisma.place.findMany({
      // public map shows ACTIVE places only — moderation INACTIVE/DRAFT hidden;
      // approving a submission publishes a new ACTIVE place that appears here.
      where: {
        status: 'ACTIVE',
        ...(cat ? { categories: { some: { categoryId: cat } } } : {}),
      },
      include: PLACE_INCLUDE,
      orderBy: { sort: 'asc' },
    })
    return rows.map(toCard)
  }

  async getBySlug(slug: string): Promise<PlaceDetailDto> {
    const row = await this.prisma.place.findUnique({
      where: { slug },
      include: PLACE_INCLUDE,
    })
    if (!row) throw new NotFoundException(`place not found: ${slug}`)
    return toDetail(row)
  }
}
