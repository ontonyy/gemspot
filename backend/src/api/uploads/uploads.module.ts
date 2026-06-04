import { Module } from '@nestjs/common'
import { UploadsController } from './uploads.controller'
import { AuthModule } from '../auth/auth.module'
import { LocalDiskStorageService, StorageService } from '../../infra/storage/storage.service'

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [{ provide: StorageService, useClass: LocalDiskStorageService }],
})
export class UploadsModule {}
