import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../infra/prisma/prisma.service'
import type { SubmissionDto, SubmissionInputDto } from '../../contracts/dto/submission.dto'

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: SubmissionInputDto): Promise<SubmissionDto> {
    const row = await this.prisma.submission.create({
      data: {
        name: input.name,
        categoryId: input.categoryId,
        lat: input.lat,
        lng: input.lng,
        note: input.note,
        photoCount: input.photoCount ?? 0,
        status: 'PENDING',
      },
    })
    // submittedAt returned as the mock's human-relative label for stable UX
    return {
      id: row.id,
      name: row.name,
      categoryId: input.categoryId,
      lat: row.lat,
      lng: row.lng,
      note: row.note,
      photoCount: input.photoCount,
      status: 'PENDING',
      submittedAt: 'just now',
    }
  }
}
