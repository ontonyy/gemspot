import { Controller, Get, Param, Query } from '@nestjs/common'
import { PlacesService } from '../../application/places/places.service'
import type { CategoryId, PlaceCardDto, PlaceDetailDto } from '../../contracts/dto/place.dto'

@Controller('places')
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get()
  list(@Query('cat') cat?: CategoryId): Promise<PlaceCardDto[]> {
    return this.places.list(cat)
  }

  // slug, not id — matches the mock getPlace(slug) seam
  @Get(':slug')
  getOne(@Param('slug') slug: string): Promise<PlaceDetailDto> {
    return this.places.getBySlug(slug)
  }
}
