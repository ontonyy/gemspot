import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { SubmissionsService } from '../../application/submissions/submissions.service'
import { SubmissionInputDto, type SubmissionDto } from '../../contracts/dto/submission.dto'
import { CurrentUser, JwtAuthGuard, type AuthUser } from '../auth/jwt-auth.guard'

@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() input: SubmissionInputDto): Promise<SubmissionDto> {
    return this.submissions.create(input, user.id)
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser): Promise<SubmissionDto[]> {
    return this.submissions.listMine(user.id)
  }
}
