import { Injectable } from '@nestjs/common'
import type { ReportReason as PrismaReportReason } from '@prisma/client'
import { PrismaService } from '../../infra/prisma/prisma.service'
import type { ReportDto, ReportInputDto, ReportReason } from '../../contracts/dto/report.dto'

const REASON_TO_DB: Record<ReportReason, PrismaReportReason> = {
  closed: 'CLOSED',
  'wrong-location': 'WRONG_LOCATION',
  'not-free': 'NOT_FREE',
  other: 'OTHER',
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: ReportInputDto, userId: string): Promise<ReportDto> {
    const row = await this.prisma.report.create({
      data: {
        userId,
        placeId: input.placeId,
        placeSlug: input.placeSlug,
        placeName: input.placeName,
        reason: REASON_TO_DB[input.reason],
        note: input.note,
        status: 'OPEN',
      },
    })
    return {
      id: row.id,
      placeId: input.placeId,
      placeSlug: input.placeSlug,
      placeName: input.placeName,
      reason: input.reason,
      note: input.note,
      status: 'OPEN',
      reportedAt: 'just now',
    }
  }
}
