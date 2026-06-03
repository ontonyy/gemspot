import { Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

/* Object-storage seam. LocalDiskStorageService writes to UPLOADS_DIR and returns
   a public URL served by useStaticAssets('/uploads') — swap this provider for an
   S3/R2 client later with no controller changes. The interface is the contract
   the uploads controller codes against. */
export interface StoredFile {
  url: string
}

export abstract class StorageService {
  abstract save(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<StoredFile>
}

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads')
// Origin the SPA loads images from. In prod set ASSET_BASE_URL to the API origin.
const ASSET_BASE_URL = (process.env.ASSET_BASE_URL ?? `http://localhost:${process.env.PORT ?? 4000}`).replace(/\/$/, '')

@Injectable()
export class LocalDiskStorageService extends StorageService {
  constructor() {
    super()
    if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true })
  }

  async save(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<StoredFile> {
    const ext = (extname(file.originalname) || mimeExt(file.mimetype)).toLowerCase()
    const name = `${randomUUID()}${ext}`
    await writeFile(join(UPLOADS_DIR, name), file.buffer)
    return { url: `${ASSET_BASE_URL}/uploads/${name}` }
  }
}

export const UPLOADS_PATH = UPLOADS_DIR

function mimeExt(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/webp':
      return '.webp'
    case 'image/gif':
      return '.gif'
    default:
      return ''
  }
}
