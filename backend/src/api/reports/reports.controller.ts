import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { ReportsService } from '../../application/reports/reports.service'
import { ReportInputDto, type ReportDto } from '../../contracts/dto/report.dto'
import { CurrentUser, JwtAuthGuard, type AuthUser } from '../auth/jwt-auth.guard'

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() input: ReportInputDto): Promise<ReportDto> {
    return this.reports.create(input, user.id)
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser): Promise<ReportDto[]> {
    return this.reports.listMine(user.id)
  }
}
