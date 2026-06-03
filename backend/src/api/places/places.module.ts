import { Module } from '@nestjs/common'
import { PlacesController } from './places.controller'
import { PlacesService } from '../../application/places/places.service'

@Module({
  controllers: [PlacesController],
  providers: [PlacesService],
})
export class PlacesModule {}
