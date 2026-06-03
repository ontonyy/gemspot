import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AdminService } from '../../application/admin/admin.service'
import { EventsService } from '../../application/events/events.service'
import type { EventCountDto } from '../../contracts/dto/event.dto'
import {
  SetPlaceStatusDto,
  SetReportStatusDto,
  type AdminPlaceDto,
  type AdminReportDto,
  type AdminStatsDto,
  type AdminSubmissionDto,
  type AdminUserDto,
  type ApproveResultDto,
} from '../../contracts/dto/admin.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { AdminGuard } from './admin-role.guard'

/* Role-gated moderation API. Every route requires a valid access token AND the
   ADMIN role (JwtAuthGuard attaches req.user, AdminGuard checks role). */
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly events: EventsService,
  ) {}

  @Get('events')
  eventCounts(): Promise<EventCountDto[]> {
    return this.events.counts()
  }

  @Get('stats')
  stats(): Promise<AdminStatsDto> {
    return this.admin.stats()
  }

  @Get('submissions')
  submissions(@Query('status') status?: string): Promise<AdminSubmissionDto[]> {
    return this.admin.listSubmissions(status)
  }

  @Post('submissions/:id/approve')
  @HttpCode(200)
  approve(@Param('id') id: string): Promise<ApproveResultDto> {
    return this.admin.approveSubmission(id)
  }

  @Post('submissions/:id/reject')
  @HttpCode(200)
  reject(@Param('id') id: string): Promise<{ id: string; status: string }> {
    return this.admin.rejectSubmission(id)
  }

  @Get('places')
  places(): Promise<AdminPlaceDto[]> {
    return this.admin.listPlaces()
  }

  @Patch('places/:id/status')
  setPlaceStatus(
    @Param('id') id: string,
    @Body() body: SetPlaceStatusDto,
  ): Promise<AdminPlaceDto> {
    return this.admin.setPlaceStatus(id, body.status)
  }

  @Get('reports')
  reports(@Query('status') status?: string): Promise<AdminReportDto[]> {
    return this.admin.listReports(status)
  }

  @Patch('reports/:id/status')
  setReportStatus(
    @Param('id') id: string,
    @Body() body: SetReportStatusDto,
  ): Promise<AdminReportDto> {
    return this.admin.setReportStatus(id, body.status)
  }

  @Get('users')
  users(): Promise<AdminUserDto[]> {
    return this.admin.listUsers()
  }
}
