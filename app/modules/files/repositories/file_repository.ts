import LucidRepository from '#shared/lucid/lucid_repository'
import File from '#modules/files/models/file'
import type IFile from '#modules/files/interfaces/file_interface'

export default class FileRepository
  extends LucidRepository<typeof File>
  implements IFile.Repository
{
  constructor() {
    super(File)
  }

  findForTenant(tenantId: number, fileId: number): Promise<File | null> {
    return File.query().where('tenant_id', tenantId).where('id', fileId).first()
  }

  createForTenant(
    tenantId: number,
    ownerId: number,
    data: Pick<
      File,
      'client_name' | 'file_name' | 'file_size' | 'file_type' | 'file_category' | 'storage_disk'
    >
  ): Promise<File> {
    return File.create({
      tenant_id: tenantId,
      owner_id: ownerId,
      ...data,
    })
  }
}
