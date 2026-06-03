import { Injectable, NotFoundException } from '@nestjs/common'
import type { PlaceStatus, ReportReason, ReportStatus } from '@prisma/client'
import { PrismaService } from '../../infra/prisma/prisma.service'
import { relativeTime } from '../common/relative-time'
import type { CategoryId } from '../../contracts/dto/place.dto'
import type {
  AdminPlaceDto,
  AdminPlaceStatus,
  AdminReportDto,
  AdminReportStatus,
  AdminStatsDto,
  AdminSubmissionDto,
  AdminUserDto,
  ApproveResultDto,
} from '../../contracts/dto/admin.dto'

const REASON_TO_FRONT: Record<ReportReason, string> = {
  CLOSED: 'closed',
  WRONG_LOCATION: 'wrong-location',
  NOT_FREE: 'not-free',
  OTHER: 'other',
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'spot'
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(): Promise<AdminStatsDto> {
    const [places, activePlaces, pendingSubmissions, openReports, users] =
      await Promise.all([
        this.prisma.place.count(),
        this.prisma.place.count({ where: { status: 'ACTIVE' } }),
        this.prisma.submission.count({ where: { status: 'PENDING' } }),
        this.prisma.report.count({ where: { status: 'OPEN' } }),
        this.prisma.user.count(),
      ])
    return { places, activePlaces, pendingSubmissions, openReports, users }
  }

  async listSubmissions(status?: string): Promise<AdminSubmissionDto[]> {
    const rows = await this.prisma.submission.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { submittedAt: 'desc' },
      include: {
        photos: { orderBy: { sort: 'asc' } },
        user: { select: { email: true } },
      },
    })
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      categoryId: r.categoryId as CategoryId,
      lat: r.lat,
      lng: r.lng,
      note: r.note,
      photoUrls: r.photos.map((p) => p.url),
      status: r.status,
      submittedAt: relativeTime(r.submittedAt),
      submitterEmail: r.user?.email ?? null,
    }))
  }

  // Approve a PENDING submission → publish it as an ACTIVE Place so it shows on
  // the public map. Marks the submission APPROVED. Idempotent-ish: throws if the
  // submission is missing; re-approving an already-approved one is a no-op create
  // guarded by the status check.
  async approveSubmission(id: string): Promise<ApproveResultDto> {
    const sub = await this.prisma.submission.findUnique({
      where: { id },
      include: { photos: { orderBy: { sort: 'asc' } } },
    })
    if (!sub) throw new NotFoundException(`submission not found: ${id}`)

    // next zero-padded place id + sort (after the existing 01..10 set)
    const last = await this.prisma.place.findFirst({ orderBy: { sort: 'desc' } })
    const nextSort = (last?.sort ?? -1) + 1
    const nextId = String(nextSort + 1).padStart(2, '0')

    // unique slug
    let slug = slugify(sub.name)
    let n = 1
    while (await this.prisma.place.findUnique({ where: { slug } })) {
      n += 1
      slug = `${slugify(sub.name)}-${n}`
    }

    const place = await this.prisma.$transaction(async (tx) => {
      const created = await tx.place.create({
        data: {
          id: nextId,
          slug,
          name: sub.name,
          neighborhood: 'Tallinn',
          lat: sub.lat,
          lng: sub.lng,
          status: 'ACTIVE',
          isFree: true,
          tags: [],
          note: sub.note,
          contributorName: 'Community',
          verifiedLabel: 'just now',
          accessNote: 'Free',
          litNote: '—',
          bestNote: '—',
          sort: nextSort,
          categories: { create: { categoryId: sub.categoryId, primary: true } },
          photos: {
            create: sub.photos.map((p, sort) => ({ url: p.url, sort })),
          },
        },
      })
      await tx.submission.update({ where: { id }, data: { status: 'APPROVED' } })
      return created
    })

    return { placeId: place.id, placeSlug: place.slug }
  }

  async rejectSubmission(id: string): Promise<{ id: string; status: string }> {
    const sub = await this.prisma.submission.findUnique({ where: { id } })
    if (!sub) throw new NotFoundException(`submission not found: ${id}`)
    await this.prisma.submission.update({ where: { id }, data: { status: 'REJECTED' } })
    return { id, status: 'REJECTED' }
  }

  async listPlaces(): Promise<AdminPlaceDto[]> {
    const rows = await this.prisma.place.findMany({
      orderBy: { sort: 'asc' },
      include: { categories: { orderBy: { primary: 'desc' } } },
    })
    return rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      neighborhood: p.neighborhood,
      categoryId: p.categories[0]?.categoryId ?? '',
      status: p.status as AdminPlaceStatus,
      isFree: p.isFree,
      savesCount: p.savesCount,
    }))
  }

  async setPlaceStatus(id: string, status: AdminPlaceStatus): Promise<AdminPlaceDto> {
    const exists = await this.prisma.place.findUnique({ where: { id } })
    if (!exists) throw new NotFoundException(`place not found: ${id}`)
    await this.prisma.place.update({ where: { id }, data: { status: status as PlaceStatus } })
    const [updated] = await this.listPlacesById(id)
    return updated
  }

  private async listPlacesById(id: string): Promise<AdminPlaceDto[]> {
    const p = await this.prisma.place.findUnique({
      where: { id },
      include: { categories: { orderBy: { primary: 'desc' } } },
    })
    if (!p) return []
    return [
      {
        id: p.id,
        slug: p.slug,
        name: p.name,
        neighborhood: p.neighborhood,
        categoryId: p.categories[0]?.categoryId ?? '',
        status: p.status as AdminPlaceStatus,
        isFree: p.isFree,
        savesCount: p.savesCount,
      },
    ]
  }

  async listReports(status?: string): Promise<AdminReportDto[]> {
    const rows = await this.prisma.report.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { reportedAt: 'desc' },
      include: { user: { select: { email: true } } },
    })
    return rows.map((r) => ({
      id: r.id,
      placeSlug: r.placeSlug,
      placeName: r.placeName,
      reason: REASON_TO_FRONT[r.reason],
      note: r.note,
      status: r.status,
      reportedAt: relativeTime(r.reportedAt),
      reporterEmail: r.user?.email ?? null,
    }))
  }

  async setReportStatus(id: string, status: AdminReportStatus): Promise<AdminReportDto> {
    const exists = await this.prisma.report.findUnique({ where: { id } })
    if (!exists) throw new NotFoundException(`report not found: ${id}`)
    await this.prisma.report.update({ where: { id }, data: { status: status as ReportStatus } })
    const rows = await this.listReports()
    return rows.find((r) => r.id === id)!
  }

  async listUsers(): Promise<AdminUserDto[]> {
    const rows = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { profile: { select: { name: true } } },
    })
    return rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.profile?.name ?? null,
      role: u.role,
      createdAt: relativeTime(u.createdAt),
    }))
  }
}
