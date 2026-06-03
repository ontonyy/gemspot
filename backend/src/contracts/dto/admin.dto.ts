/* Admin/moderation DTOs — consumed only by the role-gated /admin panel, NOT by
   the public consumer contract (place.dto.ts stays byte-identical to the mock).
   These are free to evolve independently. */

import { IsIn } from 'class-validator'
import type { CategoryId } from './place.dto'

export type AdminPlaceStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT'
export type AdminSubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type AdminReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED'

export interface AdminStatsDto {
  places: number
  activePlaces: number
  pendingSubmissions: number
  openReports: number
  users: number
}

export interface AdminSubmissionDto {
  id: string
  name: string
  categoryId: CategoryId
  lat: number
  lng: number
  note: string
  photoUrls: string[]
  status: AdminSubmissionStatus
  submittedAt: string // relative
  submitterEmail: string | null
}

export interface AdminPlaceDto {
  id: string
  slug: string
  name: string
  neighborhood: string
  categoryId: string
  status: AdminPlaceStatus
  isFree: boolean
  savesCount: number
}

export interface AdminReportDto {
  id: string
  placeSlug: string
  placeName: string
  reason: string
  note: string | null
  status: AdminReportStatus
  reportedAt: string // relative
  reporterEmail: string | null
}

export interface AdminUserDto {
  id: string
  email: string
  name: string | null
  role: 'CLIENT' | 'ADMIN'
  createdAt: string
}

export class SetPlaceStatusDto {
  @IsIn(['ACTIVE', 'INACTIVE', 'DRAFT'])
  status!: AdminPlaceStatus
}

export class SetReportStatusDto {
  @IsIn(['OPEN', 'RESOLVED', 'DISMISSED'])
  status!: AdminReportStatus
}

export interface ApproveResultDto {
  placeId: string
  placeSlug: string
}
