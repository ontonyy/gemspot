import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { EventsService } from '../../application/events/events.service'
import { CreateEventDto } from '../../contracts/dto/event.dto'

/* Public analytics ingress — no auth, anonymous by design. The SPA's track()
   util fires here from call sites (save/share/directions/pin/filter/submission). */
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  @HttpCode(202)
  track(@Body() body: CreateEventDto): Promise<{ ok: true }> {
    return this.events.track(body)
  }
}
