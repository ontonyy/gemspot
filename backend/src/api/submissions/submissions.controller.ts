import { Body, Controller, Post } from '@nestjs/common'
import { SubmissionsService } from '../../application/submissions/submissions.service'
import { SubmissionInputDto, type SubmissionDto } from '../../contracts/dto/submission.dto'

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Post()
  create(@Body() input: SubmissionInputDto): Promise<SubmissionDto> {
    return this.submissions.create(input)
  }
}
