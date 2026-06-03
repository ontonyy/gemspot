import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

const ACCESS_SECRET = process.env.JWT_SECRET ?? 'gemspot-dev-access-secret'

export interface AuthUser {
  id: string
  email: string
  role: 'CLIENT' | 'ADMIN'
}

interface AuthedRequest {
  headers: { authorization?: string }
  user?: AuthUser
}

/* Mandatory auth guard. Verifies the `Authorization: Bearer <access>` JWT and
   attaches { id, email, role } to the request. Rejects with 401 when missing
   or invalid — gates submissions/reports/saved (unauth POST rejected). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>()
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required')
    }
    const token = header.slice('Bearer '.length).trim()
    try {
      const claims = await this.jwt.verifyAsync<{
        sub: string
        email: string
        role: 'CLIENT' | 'ADMIN'
      }>(token, { secret: ACCESS_SECRET })
      req.user = { id: claims.sub, email: claims.email, role: claims.role }
      return true
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>()
    return req.user as AuthUser
  },
)
