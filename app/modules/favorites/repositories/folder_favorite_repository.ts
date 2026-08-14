import db from '@adonisjs/lucid/services/db'

import Folder from '#modules/folders/models/folder'

export default class FolderFavoriteRepository {
  list(tenantId: number, userId: number): Promise<Folder[]> {
    return (
      Folder.query()
        .select('folders.*')
        /**
         * A subquery rather than a join: the sidebar shows one badge per folder,
         * and joining `processes` would multiply the favourite rows and force a
         * group-by over every selected column just to get back where we started.
         */
        .select(
          db.raw(
            `(select count(*) from processes
            where processes.folder_id = folders.id
              and processes.tenant_id = ?
              and processes.deleted_at is null) as processes_count`,
            [tenantId]
          )
        )
        .innerJoin('folder_favorites', 'folder_favorites.folder_id', 'folders.id')
        .where('folders.tenant_id', tenantId)
        .whereNull('folders.deleted_at')
        .where('folder_favorites.tenant_id', tenantId)
        .where('folder_favorites.user_id', userId)
        .preload('client')
        .preload('responsible_lawyer')
        .orderBy('folder_favorites.created_at', 'desc')
    )
  }

  findFolder(tenantId: number, folderId: number) {
    return db
      .from('folders')
      .where({ tenant_id: tenantId, id: folderId })
      .whereNull('deleted_at')
      .first()
  }

  async exists(tenantId: number, userId: number, folderId: number): Promise<boolean> {
    return Boolean(
      await db
        .from('folder_favorites')
        .where({ tenant_id: tenantId, user_id: userId, folder_id: folderId })
        .first()
    )
  }

  async add(tenantId: number, userId: number, folderId: number): Promise<void> {
    await db
      .table('folder_favorites')
      .insert({ tenant_id: tenantId, user_id: userId, folder_id: folderId })
      .onConflict(['tenant_id', 'user_id', 'folder_id'])
      .ignore()
  }

  async remove(tenantId: number, userId: number, folderId: number): Promise<void> {
    await db
      .from('folder_favorites')
      .where({ tenant_id: tenantId, user_id: userId, folder_id: folderId })
      .delete()
  }
}
