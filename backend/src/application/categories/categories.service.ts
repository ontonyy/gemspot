import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../infra/prisma/prisma.service'
import type { CategoryDto } from '../../contracts/dto/place.dto'
import { toCategoryDto } from '../places/place.mapper'

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<CategoryDto[]> {
    const rows = await this.prisma.category.findMany({ orderBy: { sort: 'asc' } })
    return rows.map(toCategoryDto)
  }
}
