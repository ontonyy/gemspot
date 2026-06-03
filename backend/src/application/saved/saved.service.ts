import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../infra/prisma/prisma.service'

/* Per-user saved places. Stores place ids; ignores unknown ids defensively so a
   stale guest localStorage entry never fails the merge. Returns the id list in
   stable place sort order so the Saved screen matches Explore ordering. */
@Injectable()
export class SavedService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<string[]> {
    const rows = await this.prisma.savedPlace.findMany({
      where: { userId },
      include: { place: { select: { sort: true } } },
    })
    return rows
      .sort((a, b) => (a.place?.sort ?? 0) - (b.place?.sort ?? 0))
      .map((r) => r.placeId)
  }

  async add(userId: string, placeId: string): Promise<string[]> {
    const place = await this.prisma.place.findUnique({ where: { id: placeId } })
    if (place) {
      await this.prisma.savedPlace.upsert({
        where: { userId_placeId: { userId, placeId } },
        create: { userId, placeId },
        update: {},
      })
    }
    return this.list(userId)
  }

  async remove(userId: string, placeId: string): Promise<string[]> {
    await this.prisma.savedPlace.deleteMany({ where: { userId, placeId } })
    return this.list(userId)
  }

  // Login-time merge: insert any guest ids the user doesn't already have, then
  // return the full server set. Unknown place ids are skipped (not an error).
  async merge(userId: string, placeIds: string[]): Promise<string[]> {
    if (placeIds.length > 0) {
      const known = await this.prisma.place.findMany({
        where: { id: { in: placeIds } },
        select: { id: true },
      })
      const valid = new Set(known.map((p) => p.id))
      await this.prisma.savedPlace.createMany({
        data: placeIds.filter((id) => valid.has(id)).map((placeId) => ({ userId, placeId })),
        skipDuplicates: true,
      })
    }
    return this.list(userId)
  }
}
