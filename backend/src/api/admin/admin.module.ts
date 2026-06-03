import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { AdminService } from '../../application/admin/admin.service'
import { AdminGuard } from './admin-role.guard'
import { AuthModule } from '../auth/auth.module'
import { EventsModule } from '../events/events.module'

@Module({
  imports: [AuthModule, EventsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
