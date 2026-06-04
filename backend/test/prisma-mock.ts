/* Minimal typed PrismaService stub for unit tests. Each model method is a
   jest.fn() the test arranges per case. Not a real client — only the methods the
   services under test actually call need to resolve. */
import type { PrismaService } from '../src/infra/prisma/prisma.service'

type AnyFn = jest.Mock

function model() {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  }
}

export interface PrismaMock {
  user: ReturnType<typeof model>
  profile: ReturnType<typeof model>
  place: ReturnType<typeof model>
  savedPlace: ReturnType<typeof model>
  submission: ReturnType<typeof model>
  submissionPhoto: ReturnType<typeof model>
  report: ReturnType<typeof model>
  category: ReturnType<typeof model>
  event: ReturnType<typeof model>
  $transaction: AnyFn
}

export function createPrismaMock(): PrismaMock & PrismaService {
  const m: PrismaMock = {
    user: model(),
    profile: model(),
    place: model(),
    savedPlace: model(),
    submission: model(),
    submissionPhoto: model(),
    report: model(),
    category: model(),
    event: model(),
    // default: run the callback with the same mock as the tx client
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(m)),
  }
  return m as unknown as PrismaMock & PrismaService
}
