import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { AuthService } from '../src/application/auth/auth.service'
import { createPrismaMock, PrismaMock } from './prisma-mock'

describe('AuthService', () => {
  let prisma: PrismaMock
  let svc: AuthService
  const jwt = new JwtService({})

  beforeEach(() => {
    prisma = createPrismaMock()
    svc = new AuthService(prisma as never, jwt)
  })

  describe('register', () => {
    it('rejects an already-registered email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' })
      await expect(svc.register({ email: 'A@B.com', password: 'pw123456' })).rejects.toBeInstanceOf(
        ConflictException,
      )
    })

    it('lowercases+trims email, hashes password, returns a session', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockImplementation(async ({ data }: { data: { passwordHash: string } }) => ({
        id: 'u1',
        email: 'a@b.com',
        role: 'CLIENT',
        passwordHash: data.passwordHash,
        profile: { name: 'Ann' },
      }))

      const res = await svc.register({ email: '  A@B.com ', password: 'pw123456', name: ' Ann ' })

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.com' } })
      expect(res.user).toEqual({ id: 'u1', email: 'a@b.com', name: 'Ann', role: 'CLIENT' })
      expect(res.accessToken).toEqual(expect.any(String))
      expect(res.refreshToken).toEqual(expect.any(String))
      // password stored hashed, never plaintext
      const stored = prisma.user.create.mock.calls[0][0].data.passwordHash
      expect(stored).not.toBe('pw123456')
      expect(await bcrypt.compare('pw123456', stored)).toBe(true)
    })
  })

  describe('login', () => {
    it('rejects an unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      await expect(svc.login({ email: 'x@y.com', password: 'pw' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
    })

    it('rejects a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        role: 'CLIENT',
        passwordHash: await bcrypt.hash('correct', 10),
        profile: null,
      })
      await expect(svc.login({ email: 'a@b.com', password: 'wrong' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
    })

    it('issues tokens for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        role: 'ADMIN',
        passwordHash: await bcrypt.hash('correct', 10),
        profile: { name: 'Ann' },
      })
      const res = await svc.login({ email: 'a@b.com', password: 'correct' })
      expect(res.user.role).toBe('ADMIN')
      expect(res.accessToken).toEqual(expect.any(String))
    })
  })

  describe('refresh', () => {
    it('rejects a garbage refresh token', async () => {
      await expect(svc.refresh('not-a-jwt')).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('rejects an access token used as a refresh token (wrong typ)', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      // mint via login, then feed the ACCESS token to refresh()
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'a@b.com',
        role: 'CLIENT',
        passwordHash: await bcrypt.hash('pw', 10),
        profile: null,
      })
      const { accessToken } = await svc.login({ email: 'a@b.com', password: 'pw' })
      await expect(svc.refresh(accessToken)).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('rotates tokens for a valid refresh token', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'a@b.com',
        role: 'CLIENT',
        passwordHash: await bcrypt.hash('pw', 10),
        profile: null,
      })
      const { refreshToken } = await svc.login({ email: 'a@b.com', password: 'pw' })
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'a@b.com',
        role: 'CLIENT',
        profile: { name: null },
      })
      const res = await svc.refresh(refreshToken)
      expect(res.user.id).toBe('u1')
      expect(res.accessToken).toEqual(expect.any(String))
    })
  })

  describe('oauthGoogle', () => {
    const realFetch = global.fetch
    const OLD_ID = process.env.GOOGLE_CLIENT_ID
    afterEach(() => {
      global.fetch = realFetch
      if (OLD_ID === undefined) delete process.env.GOOGLE_CLIENT_ID
      else process.env.GOOGLE_CLIENT_ID = OLD_ID
    })
    const mockTokeninfo = (body: unknown, ok = true) => {
      global.fetch = jest.fn().mockResolvedValue({ ok, json: async () => body }) as never
    }

    it('rejects when not configured', async () => {
      delete process.env.GOOGLE_CLIENT_ID
      await expect(svc.oauthGoogle('tok')).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('rejects an audience mismatch', async () => {
      process.env.GOOGLE_CLIENT_ID = 'mine'
      mockTokeninfo({ aud: 'someone-else', sub: 's', email: 'a@b.com', email_verified: 'true' })
      await expect(svc.oauthGoogle('tok')).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('rejects an unverified email', async () => {
      process.env.GOOGLE_CLIENT_ID = 'mine'
      mockTokeninfo({ aud: 'mine', sub: 's', email: 'a@b.com', email_verified: 'false' })
      await expect(svc.oauthGoogle('tok')).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('links to an existing account by verified email', async () => {
      process.env.GOOGLE_CLIENT_ID = 'mine'
      mockTokeninfo({ aud: 'mine', sub: 'g-1', email: 'A@B.com', email_verified: 'true', name: 'Ann' })
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', email: 'a@b.com', role: 'CLIENT', provider: null, profile: { name: 'Ann' },
      })
      prisma.user.update.mockResolvedValue({})
      const res = await svc.oauthGoogle('tok')
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.com' }, include: { profile: true } })
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { provider: 'google', providerId: 'g-1' } })
      expect(res.user).toEqual({ id: 'u1', email: 'a@b.com', name: 'Ann', role: 'CLIENT' })
    })

    it('creates an OAuth-only account for a new email', async () => {
      process.env.GOOGLE_CLIENT_ID = 'mine'
      mockTokeninfo({ aud: 'mine', sub: 'g-2', email: 'new@b.com', email_verified: true, name: 'Newbie' })
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({ id: 'u2', email: 'new@b.com', role: 'CLIENT', profile: { name: 'Newbie' } })
      const res = await svc.oauthGoogle('tok')
      const data = prisma.user.create.mock.calls[0][0].data
      expect(data.provider).toBe('google')
      expect(data.providerId).toBe('g-2')
      expect(data.passwordHash).toBeUndefined()
      expect(res.user.email).toBe('new@b.com')
    })
  })

  describe('me', () => {
    it('throws when the account is gone', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      await expect(svc.me('missing')).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('returns the current user view', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        role: 'CLIENT',
        profile: { name: 'Ann' },
      })
      expect(await svc.me('u1')).toEqual({ id: 'u1', email: 'a@b.com', name: 'Ann', role: 'CLIENT' })
    })
  })
})
