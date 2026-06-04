import { SavedService } from '../src/application/saved/saved.service'
import { createPrismaMock, PrismaMock } from './prisma-mock'

describe('SavedService', () => {
  let prisma: PrismaMock
  let svc: SavedService

  beforeEach(() => {
    prisma = createPrismaMock()
    svc = new SavedService(prisma as never)
  })

  describe('list', () => {
    it('returns place ids in place-sort order (matches Explore ordering)', async () => {
      prisma.savedPlace.findMany.mockResolvedValue([
        { placeId: '03', place: { sort: 2 } },
        { placeId: '01', place: { sort: 0 } },
        { placeId: '02', place: { sort: 1 } },
      ])
      expect(await svc.list('u1')).toEqual(['01', '02', '03'])
    })
  })

  describe('add', () => {
    it('upserts a known place then returns the list', async () => {
      prisma.place.findUnique.mockResolvedValue({ id: '01' })
      prisma.savedPlace.upsert.mockResolvedValue({})
      prisma.savedPlace.findMany.mockResolvedValue([{ placeId: '01', place: { sort: 0 } }])

      const res = await svc.add('u1', '01')
      expect(prisma.savedPlace.upsert).toHaveBeenCalledWith({
        where: { userId_placeId: { userId: 'u1', placeId: '01' } },
        create: { userId: 'u1', placeId: '01' },
        update: {},
      })
      expect(res).toEqual(['01'])
    })

    it('ignores an unknown place id (no upsert)', async () => {
      prisma.place.findUnique.mockResolvedValue(null)
      prisma.savedPlace.findMany.mockResolvedValue([])
      const res = await svc.add('u1', 'ZZ')
      expect(prisma.savedPlace.upsert).not.toHaveBeenCalled()
      expect(res).toEqual([])
    })
  })

  describe('merge', () => {
    it('inserts only valid guest ids, skips unknown ones, skips duplicates', async () => {
      prisma.place.findMany.mockResolvedValue([{ id: '01' }, { id: '02' }])
      prisma.savedPlace.createMany.mockResolvedValue({ count: 2 })
      prisma.savedPlace.findMany.mockResolvedValue([
        { placeId: '01', place: { sort: 0 } },
        { placeId: '02', place: { sort: 1 } },
      ])

      const res = await svc.merge('u1', ['01', '02', 'GHOST'])

      expect(prisma.savedPlace.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'u1', placeId: '01' },
          { userId: 'u1', placeId: '02' },
        ],
        skipDuplicates: true,
      })
      expect(res).toEqual(['01', '02'])
    })

    it('no-ops the insert on an empty guest set', async () => {
      prisma.savedPlace.findMany.mockResolvedValue([])
      const res = await svc.merge('u1', [])
      expect(prisma.savedPlace.createMany).not.toHaveBeenCalled()
      expect(prisma.place.findMany).not.toHaveBeenCalled()
      expect(res).toEqual([])
    })
  })

  describe('remove', () => {
    it('deletes the pair then returns the remaining list', async () => {
      prisma.savedPlace.deleteMany.mockResolvedValue({ count: 1 })
      prisma.savedPlace.findMany.mockResolvedValue([])
      const res = await svc.remove('u1', '01')
      expect(prisma.savedPlace.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1', placeId: '01' },
      })
      expect(res).toEqual([])
    })
  })
})
