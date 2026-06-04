import { NotFoundException } from '@nestjs/common'
import { AdminService } from '../src/application/admin/admin.service'
import { createPrismaMock, PrismaMock } from './prisma-mock'

describe('AdminService', () => {
  let prisma: PrismaMock
  let svc: AdminService

  beforeEach(() => {
    prisma = createPrismaMock()
    svc = new AdminService(prisma as never)
  })

  describe('stats', () => {
    it('aggregates the dashboard counters', async () => {
      prisma.place.count.mockResolvedValueOnce(12).mockResolvedValueOnce(10)
      prisma.submission.count.mockResolvedValue(3)
      prisma.report.count.mockResolvedValue(1)
      prisma.user.count.mockResolvedValue(5)
      expect(await svc.stats()).toEqual({
        places: 12,
        activePlaces: 10,
        pendingSubmissions: 3,
        openReports: 1,
        users: 5,
      })
    })
  })

  describe('approveSubmission', () => {
    it('throws when the submission is missing', async () => {
      prisma.submission.findUnique.mockResolvedValue(null)
      await expect(svc.approveSubmission('nope')).rejects.toBeInstanceOf(NotFoundException)
    })

    it('publishes a PENDING submission as an ACTIVE place and marks it APPROVED', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        id: 's1',
        name: 'Secret Hoop',
        categoryId: 'basketball',
        lat: 59.4,
        lng: 24.7,
        note: 'great',
        photos: [{ url: 'a.jpg', sort: 0 }],
      })
      prisma.place.findFirst.mockResolvedValue({ sort: 9 }) // existing 01..10
      prisma.place.findUnique.mockResolvedValue(null) // slug free
      prisma.place.create.mockResolvedValue({ id: '11', slug: 'secret-hoop' })
      prisma.submission.update.mockResolvedValue({})

      const res = await svc.approveSubmission('s1')

      const created = prisma.place.create.mock.calls[0][0].data
      expect(created.id).toBe('11') // next zero-padded id after sort 9
      expect(created.sort).toBe(10)
      expect(created.status).toBe('ACTIVE')
      expect(created.slug).toBe('secret-hoop')
      expect(created.categories.create).toEqual({ categoryId: 'basketball', primary: true })
      expect(prisma.submission.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { status: 'APPROVED' },
      })
      expect(res).toEqual({ placeId: '11', placeSlug: 'secret-hoop' })
    })

    it('disambiguates a taken slug', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        id: 's1',
        name: 'Park',
        categoryId: 'scenic',
        lat: 1,
        lng: 2,
        note: 'n',
        photos: [],
      })
      prisma.place.findFirst.mockResolvedValue(null) // empty place table → sort 0, id "01"
      prisma.place.findUnique
        .mockResolvedValueOnce({ id: '01', slug: 'park' }) // first try taken
        .mockResolvedValueOnce(null) // "park-2" free
      prisma.place.create.mockResolvedValue({ id: '01', slug: 'park-2' })
      prisma.submission.update.mockResolvedValue({})

      const res = await svc.approveSubmission('s1')
      expect(prisma.place.create.mock.calls[0][0].data.slug).toBe('park-2')
      expect(res.placeSlug).toBe('park-2')
    })
  })

  describe('rejectSubmission', () => {
    it('throws when missing', async () => {
      prisma.submission.findUnique.mockResolvedValue(null)
      await expect(svc.rejectSubmission('x')).rejects.toBeInstanceOf(NotFoundException)
    })

    it('flips the submission to REJECTED', async () => {
      prisma.submission.findUnique.mockResolvedValue({ id: 's1' })
      prisma.submission.update.mockResolvedValue({})
      const res = await svc.rejectSubmission('s1')
      expect(prisma.submission.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { status: 'REJECTED' },
      })
      expect(res).toEqual({ id: 's1', status: 'REJECTED' })
    })
  })

  describe('setPlaceStatus', () => {
    it('throws when the place is missing', async () => {
      prisma.place.findUnique.mockResolvedValue(null)
      await expect(svc.setPlaceStatus('x', 'INACTIVE')).rejects.toBeInstanceOf(NotFoundException)
    })

    it('updates status and returns the place view', async () => {
      prisma.place.findUnique
        .mockResolvedValueOnce({ id: '01' }) // existence check
        .mockResolvedValueOnce({
          id: '01',
          slug: 'a',
          name: 'A',
          neighborhood: 'Tallinn',
          status: 'INACTIVE',
          isFree: true,
          savesCount: 0,
          categories: [{ categoryId: 'scenic' }],
        })
      prisma.place.update.mockResolvedValue({})
      const res = await svc.setPlaceStatus('01', 'INACTIVE')
      expect(prisma.place.update).toHaveBeenCalledWith({
        where: { id: '01' },
        data: { status: 'INACTIVE' },
      })
      expect(res.status).toBe('INACTIVE')
      expect(res.categoryId).toBe('scenic')
    })
  })

  describe('setReportStatus', () => {
    it('throws when the report is missing', async () => {
      prisma.report.findUnique.mockResolvedValue(null)
      await expect(svc.setReportStatus('x', 'RESOLVED')).rejects.toBeInstanceOf(NotFoundException)
    })

    it('flips status and returns the mapped report', async () => {
      prisma.report.findUnique.mockResolvedValue({ id: 'r1' })
      prisma.report.update.mockResolvedValue({})
      prisma.report.findMany.mockResolvedValue([
        {
          id: 'r1',
          placeSlug: 'a',
          placeName: 'A',
          reason: 'CLOSED',
          note: null,
          status: 'RESOLVED',
          reportedAt: new Date(),
          user: { email: 'r@e.com' },
        },
      ])
      const res = await svc.setReportStatus('r1', 'RESOLVED')
      expect(res.status).toBe('RESOLVED')
      expect(res.reason).toBe('closed') // enum → frontend slug
      expect(res.reporterEmail).toBe('r@e.com')
    })
  })
})
