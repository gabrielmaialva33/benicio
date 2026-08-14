import { randomUUID } from 'node:crypto'

import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import drive from '@adonisjs/drive/services/main'
import type { MultipartFile } from '@adonisjs/core/types/bodyparser'

import env from '#start/env'
import FileRepository from '#modules/files/repositories/file_repository'
import type { FileStorageDisk } from '#modules/files/interfaces/file_interface'

@inject()
export default class UploadFileService {
  constructor(private readonly fileRepository: FileRepository) {}

  async run(tenantId: number, ownerId: number, file: MultipartFile) {
    const storageDisk = env.get('DRIVE_DISK') as FileStorageDisk
    const extension = file.extname?.toLowerCase() || 'bin'
    const key = `tenants/${tenantId}/uploads/${randomUUID()}.${extension}`
    const clientName = this.clientName(file)
    const fileCategory = this.category(extension)
    const fileType = this.mimeType(file.type, extension, fileCategory)

    await file.moveToDisk(key)

    try {
      const storedFile = await this.fileRepository.createForTenant(tenantId, ownerId, {
        client_name: clientName,
        file_name: key,
        file_size: file.size || 0,
        file_type: fileType,
        file_category: fileCategory,
        storage_disk: storageDisk,
      })

      return {
        id: storedFile.id,
        fileId: storedFile.id,
        url: storedFile.url,
        clientName,
        fileCategory,
        fileType,
        size: file.size,
        extname: file.extname,
      }
    } catch (error) {
      try {
        await drive.use(storageDisk).delete(key)
      } catch (cleanupError) {
        logger.error(
          {
            err: cleanupError,
            tenantId,
            storageDisk,
            storageKey: key,
          },
          'Failed to remove an orphaned upload after database failure'
        )
      }
      throw error
    }
  }

  private clientName(file: MultipartFile): string {
    const original = file.clientName?.trim() || 'arquivo'
    const suffix = file.extname ? `.${file.extname}` : ''
    const withoutExtension =
      suffix && original.toLowerCase().endsWith(suffix.toLowerCase())
        ? original.slice(0, -suffix.length)
        : original
    const sanitized = [...withoutExtension]
      .map((character) =>
        character.charCodeAt(0) < 32 || character === '/' || character === '\\' ? '_' : character
      )
      .join('')
    return sanitized.slice(0, 255) || 'arquivo'
  }

  private category(extension: string): string {
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return 'image'
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(extension)) {
      return 'document'
    }
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) return 'video'
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(extension)) return 'audio'
    return 'file'
  }

  private mimeType(provided: string | undefined, extension: string, category: string): string {
    if (provided?.trim() && provided !== category) return provided

    const byExtension: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
      csv: 'text/csv',
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      flac: 'audio/flac',
    }
    return byExtension[extension] ?? 'application/octet-stream'
  }
}
