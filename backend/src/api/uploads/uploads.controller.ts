import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { StorageService, type StoredFile } from '../../infra/storage/storage.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

/* Multipart photo upload (auth-gated). Field name `file`; returns { url } the SPA
   then carries on a submission (photoUrls). Validates mime + size; storage backend
   is the swappable StorageService. */
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  async upload(@UploadedFile() file?: Express.Multer.File): Promise<StoredFile> {
    if (!file) throw new BadRequestException('No file uploaded (field "file")')
    if (!ALLOWED.has(file.mimetype)) throw new BadRequestException('Unsupported image type')
    return this.storage.save(file)
  }
}
