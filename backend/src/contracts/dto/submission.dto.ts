import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, MinLength, Min } from 'class-validator'
import type { CategoryId } from './place.dto'

const CATEGORY_IDS = ['tabletennis', 'basketball', 'football', 'tennis', 'padel', 'scenic', 'sakura']

/* Mirrors SubmissionInput in web types.ts. Validated on the wire. */
export class SubmissionInputDto {
  @IsString()
  @MinLength(1)
  name!: string

  @IsIn(CATEGORY_IDS)
  categoryId!: CategoryId

  @IsNumber()
  lat!: number

  @IsNumber()
  lng!: number

  @IsString()
  note!: string

  @IsOptional()
  @IsInt()
  @Min(0)
  photoCount?: number

  // public URLs returned by POST /uploads; persisted as SubmissionPhoto rows
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  photoUrls?: string[]
}

export interface SubmissionDto {
  name: string
  categoryId: CategoryId
  lat: number
  lng: number
  note: string
  photoCount?: number
  photoUrls?: string[]
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  submittedAt: string
}
