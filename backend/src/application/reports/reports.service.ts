import { Injectable } from '@nestjs/common'
import type { Report, ReportReason as PrismaReportReason } from '@prisma/client'
import { PrismaService } from '../../infra/prisma/prisma.service'
import { relativeTime } from '../common/relative-time'
import type { ReportDto, ReportInputDto, ReportReason } from '../../contracts/dto/report.dto'

const REASON_TO_DB: Record<ReportReason, PrismaReportReason> = {
  closed: 'CLOSED',
  'wrong-location': 'WRONG_LOCATION',
  'not-free': 'NOT_FREE',
  other: 'OTHER',
}

const REASON_FROM_DB: Record<PrismaReportReason, ReportReason> = {
  CLOSED: 'closed',
  WRONG_LOCATION: 'wrong-location',
  NOT_FREE: 'not-free',
  OTHER: 'other',
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

  // OPEN reports for the signed-in user — survives reload (server-backed).
  async listMine(userId: string): Promise<ReportDto[]> {
    const rows = await this.prisma.report.findMany({
      where: { userId },
      orderBy: { reportedAt: 'desc' },
    })
    return rows.map((r: Report) => ({
      id: r.id,
      placeId: r.placeId ?? '',
      placeSlug: r.placeSlug,
      placeName: r.placeName,
      reason: REASON_FROM_DB[r.reason],
      note: r.note ?? undefined,
      status: r.status as 'OPEN',
      reportedAt: relativeTime(r.reportedAt),
    }))
  }
}
