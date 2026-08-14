import type LucidRepositoryInterface from '#shared/lucid/lucid_repository_interface'
import type File from '#modules/files/models/file'

export const FILE_STORAGE_DISKS = ['fs', 's3', 'spaces', 'r2', 'gcs'] as const
export type FileStorageDisk = (typeof FILE_STORAGE_DISKS)[number]

namespace IFile {
  export interface Repository extends LucidRepositoryInterface<typeof File> {}
}

export default IFile
