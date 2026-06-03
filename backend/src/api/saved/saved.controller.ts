import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { SavedService } from '../../application/saved/saved.service'
import { MergeSavedDto, SavePlaceDto } from '../../contracts/dto/saved.dto'
import { CurrentUser, JwtAuthGuard, type AuthUser } from '../auth/jwt-auth.guard'

@Controller('saved')
@UseGuards(JwtAuthGuard)
export class SavedController {
  constructor(private readonly saved: SavedService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<string[]> {
    return this.saved.list(user.id)
  }

  @Post()
  @HttpCode(200)
  add(@CurrentUser() user: AuthUser, @Body() body: SavePlaceDto): Promise<string[]> {
    return this.saved.add(user.id, body.placeId)
  }

  @Post('merge')
  @HttpCode(200)
  merge(@CurrentUser() user: AuthUser, @Body() body: MergeSavedDto): Promise<string[]> {
    return this.saved.merge(user.id, body.placeIds)
  }

  @Delete(':placeId')
  remove(@CurrentUser() user: AuthUser, @Param('placeId') placeId: string): Promise<string[]> {
    return this.saved.remove(user.id, placeId)
  }
}
