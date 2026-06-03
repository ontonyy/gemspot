import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../infra/prisma/prisma.service'
import type { CreateEventDto, EventCountDto } from '../../contracts/dto/event.dto'

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async track(input: CreateEventDto): Promise<{ ok: true }> {
    await this.prisma.event.create({
      data: {
        name: input.name,
        props: (input.props ?? undefined) as Prisma.InputJsonValue | undefined,
        placeId: input.placeId,
      },
    })
    return { ok: true }
  }

  // Grouped counts for the admin dashboard.
  async counts(): Promise<EventCountDto[]> {
    const rows = await this.prisma.event.groupBy({
      by: ['name'],
      _count: { _all: true },
      orderBy: { _count: { name: 'desc' } },
    })
    return rows.map((r) => ({ name: r.name, count: r._count._all }))
  }
}
