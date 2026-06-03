import { Controller, Get, Param } from '@nestjs/common'
import { GuidesService } from '../../application/guides/guides.service'
import type { GuideDto, PlaceCardDto } from '../../contracts/dto/place.dto'

@Controller('guides')
export class GuidesController {
  constructor(private readonly guides: GuidesService) {}

  @Get()
  list(): Promise<GuideDto[]> {
    return this.guides.list()
  }

  @Get(':id')
  getOne(@Param('id') id: string): Promise<{ guide: GuideDto; spots: PlaceCardDto[] }> {
    return this.guides.getById(id)
  }
}
