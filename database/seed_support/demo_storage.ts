import { readFile } from 'node:fs/promises'

import app from '@adonisjs/core/services/app'
import drive from '@adonisjs/drive/services/main'

import env from '#start/env'
import type { FileStorageDisk } from '#modules/files/interfaces/file_interface'

export interface StoredDemoAsset {
  size: number
  storageDisk: FileStorageDisk
}

/**
 * Copies a deterministic demo asset to the configured private Drive disk.
 * Re-running a seed overwrites the same key, so a failed database transaction
 * cannot leave an ever-growing set of orphaned objects.
 */
export async function storeDemoAsset(
  publicPath: string,
  storageKey: string,
  contentType: string
): Promise<StoredDemoAsset> {
  const contents = await readFile(app.publicPath(publicPath))
  const storageDisk = env.get('DRIVE_DISK') as FileStorageDisk

  await drive.use(storageDisk).put(storageKey, contents, {
    contentType,
    visibility: 'private',
  })

  return { size: contents.byteLength, storageDisk }
}
