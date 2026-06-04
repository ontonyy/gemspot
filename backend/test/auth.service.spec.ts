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
