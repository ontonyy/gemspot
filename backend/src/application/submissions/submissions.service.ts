import { Injectable } from '@nestjs/common'
import type { Submission, SubmissionPhoto } from '@prisma/client'
import { PrismaService } from '../../infra/prisma/prisma.service'
import { relativeTime } from '../common/relative-time'
import type { CategoryId } from '../../contracts/dto/place.dto'
import type { SubmissionDto, SubmissionInputDto } from '../../contracts/dto/submission.dto'

type SubmissionWithPhotos = Submission & { photos: SubmissionPhoto[] }

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: SubmissionInputDto, userId: string): Promise<SubmissionDto> {
    const urls = input.photoUrls ?? []
    const row = await this.prisma.submission.create({
      data: {
        userId,
        name: input.name,
        categoryId: input.categoryId,
        lat: input.lat,
        lng: input.lng,
        note: input.note,
        photoCount: input.photoCount ?? urls.length,
        status: 'PENDING',
        photos: { create: urls.map((url, sort) => ({ url, sort })) },
      },
      include: { photos: { orderBy: { sort: 'asc' } } },
    })
    return this.toDto(row)
  }

  // PENDING submissions for the signed-in user — survives reload (server-backed).
  async listMine(userId: string): Promise<SubmissionDto[]> {
    const rows = await this.prisma.submission.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      include: { photos: { orderBy: { sort: 'asc' } } },
    })
    return rows.map((r) => this.toDto(r))
  }

  private toDto(row: SubmissionWithPhotos): SubmissionDto {
    return {
      id: row.id,
      name: row.name,
      categoryId: row.categoryId as CategoryId,
      lat: row.lat,
      lng: row.lng,
      note: row.note,
      photoCount: row.photoCount,
      photoUrls: row.photos.map((p) => p.url),
      status: row.status,
      submittedAt: relativeTime(row.submittedAt),
    }
  }
}
