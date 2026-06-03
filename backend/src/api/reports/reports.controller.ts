import { Body, Controller, Post } from '@nestjs/common'
import { ReportsService } from '../../application/reports/reports.service'
import { ReportInputDto, type ReportDto } from '../../contracts/dto/report.dto'

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  create(@Body() input: ReportInputDto): Promise<ReportDto> {
    return this.reports.create(input)
  }
}
