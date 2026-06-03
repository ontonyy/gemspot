import { ArrayMaxSize, IsArray, IsString, MinLength } from 'class-validator'

/* Saved-places wire contract. The SPA stores place ids (PlaceCardDto.id, e.g.
   "03"); the server persists them per user in saved_places for cross-device
   sync. GET returns the id list; merge unions guest localStorage ids on login. */

export class SavePlaceDto {
  @IsString()
  @MinLength(1)
  placeId!: string
}

export class MergeSavedDto {
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  placeIds!: string[]
}
