import { SubmissionsService } from '../src/application/submissions/submissions.service'
import { createPrismaMock, PrismaMock } from './prisma-mock'

describe('SubmissionsService', () => {
  let prisma: PrismaMock
  let svc: SubmissionsService

  beforeEach(() => {
    prisma = createPrismaMock()
    svc = new SubmissionsService(prisma as never)
  })

  describe('create', () => {
    it('creates a PENDING submission with photos and returns the DTO', async () => {
      prisma.submission.create.mockResolvedValue({
        id: 's1',
        name: 'New Court',
        categoryId: 'basketball',
        lat: 59.4,
        lng: 24.7,
        note: 'nice',
        photoCount: 2,
        status: 'PENDING',
        submittedAt: new Date(),
        photos: [
          { url: 'a.jpg', sort: 0 },
          { url: 'b.jpg', sort: 1 },
        ],
      })

      const dto = await svc.create(
        {
          name: 'New Court',
          categoryId: 'basketball',
          lat: 59.4,
          lng: 24.7,
          note: 'nice',
          photoUrls: ['a.jpg', 'b.jpg'],
        },
        'u1',
      )

      const arg = prisma.submission.create.mock.calls[0][0]
      expect(arg.data.userId).toBe('u1')
      expect(arg.data.status).toBe('PENDING')
      // photoCount derives from photoUrls length when not given
      expect(arg.data.photoCount).toBe(2)
      expect(arg.data.photos.create).toEqual([
        { url: 'a.jpg', sort: 0 },
        { url: 'b.jpg', sort: 1 },
      ])
      expect(dto.status).toBe('PENDING')
      expect(dto.photoUrls).toEqual(['a.jpg', 'b.jpg'])
      expect(dto.submittedAt).toBe('just now')
    })

    it('handles a submission with no photos', async () => {
      prisma.submission.create.mockResolvedValue({
        id: 's2',
        name: 'X',
        categoryId: 'scenic',
        lat: 0,
        lng: 0,
        note: 'n',
        photoCount: 0,
        status: 'PENDING',
        submittedAt: new Date(),
        photos: [],
      })
      const dto = await svc.create(
        { name: 'X', categoryId: 'scenic', lat: 0, lng: 0, note: 'n' },
        'u1',
      )
      expect(prisma.submission.create.mock.calls[0][0].data.photos.create).toEqual([])
      expect(dto.photoUrls).toEqual([])
    })
  })

  describe('listMine', () => {
    it('returns the user submissions newest-first as DTOs', async () => {
      prisma.submission.findMany.mockResolvedValue([
        {
          id: 's1',
          name: 'A',
          categoryId: 'football',
          lat: 1,
          lng: 2,
          note: 'n',
          photoCount: 0,
          status: 'PENDING',
          submittedAt: new Date(),
          photos: [],
        },
      ])
      const res = await svc.listMine('u1')
      expect(prisma.submission.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { submittedAt: 'desc' },
        include: { photos: { orderBy: { sort: 'asc' } } },
      })
      expect(res).toHaveLength(1)
      expect(res[0].id).toBe('s1')
    })
  })
})
