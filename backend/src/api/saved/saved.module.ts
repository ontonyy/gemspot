import { Module } from '@nestjs/common'
import { SavedController } from './saved.controller'
import { SavedService } from '../../application/saved/saved.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [SavedController],
  providers: [SavedService],
})
export class SavedModule {}
