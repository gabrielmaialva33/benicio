import { inject } from '@adonisjs/core'
import drive from '@adonisjs/drive/services/main'

import NotFoundException from '#exceptions/not_found_exception'
import FileRepository from '#modules/files/repositories/file_repository'

@inject()
export default class DownloadFileService {
  constructor(private readonly fileRepository: FileRepository) {}

  async signedUrl(tenantId: number, fileId: number): Promise<string> {
    const file = await this.fileRepository.findForTenant(tenantId, fileId)
    if (!file) throw new NotFoundException('File not found')

    const filename = this.safeFilename(file.client_name, file.file_name)
    return drive.use(file.storage_disk).getSignedUrl(file.file_name, {
      expiresIn: '5 mins',
      contentType: file.file_type,
      contentDisposition: `attachment; filename="${filename}"`,
    })
  }

  private safeFilename(clientName: string, storageKey: string): string {
    const extension = storageKey
      .split('.')
      .at(-1)
      ?.replace(/[^A-Za-z0-9]/g, '')
    const basename = clientName.replace(/["\r\n\\/]/g, '_').trim() || 'arquivo'
    return extension ? `${basename}.${extension}` : basename
  }
}
