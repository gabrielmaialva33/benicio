import { type HttpContext } from '@adonisjs/core/http'

import app from '@adonisjs/core/services/app'
import { requireTenantId } from '#shared/http/tenant_context'
import UploadFileService from '#modules/files/services/upload_file_service'
import DownloadFileService from '#modules/files/services/download_file_service'

export default class FilesController {
  async upload(ctx: HttpContext) {
    const { request, response } = ctx
    const file = request.file('file', {
      size: '10mb',
      extnames: [
        'jpeg',
        'jpg',
        'png',
        'pdf',
        'doc',
        'docx',
        'txt',
        'csv',
        'xls',
        'xlsx',
        'mp3',
        'mp4',
        'zip',
      ],
    })
    if (!file) {
      return response.unprocessableEntity({
        errors: [
          {
            field: 'file',
            rule: 'required',
            message: 'The file field is required',
          },
        ],
      })
    }

    if (!file.isValid) {
      const errors: { field: string; rule: string; message: string }[] = []
      if (file.errors && file.errors.length > 0) {
        file.errors.forEach((error) => {
          if (error.type === 'size') {
            errors.push({
              field: 'file',
              rule: 'file.size',
              message: `File size should be less than ${file.sizeLimit}`,
            })
          }
          if (error.type === 'extname') {
            const allowedExts = [
              'jpeg',
              'jpg',
              'png',
              'pdf',
              'doc',
              'docx',
              'txt',
              'csv',
              'xls',
              'xlsx',
              'mp3',
              'mp4',
              'zip',
            ]
            errors.push({
              field: 'file',
              rule: 'file.extname',
              message: `Invalid file extension. Allowed: ${allowedExts.join(', ')}`,
            })
          }
        })
      }
      return response.unprocessableEntity({ errors })
    }

    const service = await app.container.make(UploadFileService)
    const data = await service.run(requireTenantId(ctx), ctx.auth.getUserOrFail().id, file)

    return response.created(data)
  }

  async download(ctx: HttpContext) {
    const service = await app.container.make(DownloadFileService)
    const url = await service.signedUrl(requireTenantId(ctx), Number(ctx.params.id))
    return ctx.response.redirect(url, true)
  }
}
