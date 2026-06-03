import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator'

/* Analytics event ingress. Public (anonymous) — no auth. `props` is free-form. */
export class CreateEventDto {
  @IsString()
  @MaxLength(64)
  name!: string

  @IsOptional()
  @IsObject()
  props?: Record<string, unknown>

  @IsOptional()
  @IsString()
  placeId?: string
}

export interface EventCountDto {
  name: string
  count: number
}
