import { IsIn, IsOptional, IsString, MinLength } from 'class-validator'

export type ReportReason = 'closed' | 'wrong-location' | 'not-free' | 'other'

const REPORT_REASONS = ['closed', 'wrong-location', 'not-free', 'other']

/* Mirrors ReportInput in web types.ts. */
export class ReportInputDto {
  @IsString()
  @MinLength(1)
  placeId!: string

  @IsString()
  @MinLength(1)
  placeSlug!: string

  @IsString()
  @MinLength(1)
  placeName!: string

  @IsIn(REPORT_REASONS)
  reason!: ReportReason

  @IsOptional()
  @IsString()
  note?: string
}

export interface ReportDto {
  placeId: string
  placeSlug: string
  placeName: string
  reason: ReportReason
  note?: string
  id: string
  status: 'OPEN'
  reportedAt: string
}
