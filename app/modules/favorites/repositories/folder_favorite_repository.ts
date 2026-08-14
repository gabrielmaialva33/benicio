import db from '@adonisjs/lucid/services/db'

import Folder from '#modules/folders/models/folder'

export default class FolderFavoriteRepository {
  list(tenantId: number, userId: number): Promise<Folder[]> {
    return Folder.query()
      .select('folders.*')
      .innerJoin('folder_favorites', 'folder_favorites.folder_id', 'folders.id')
      .where('folders.tenant_id', tenantId)
      .whereNull('folders.deleted_at')
      .where('folder_favorites.tenant_id', tenantId)
      .where('folder_favorites.user_id', userId)
      .preload('client')
      .preload('responsible_lawyer')
      .orderBy('folder_favorites.created_at', 'desc')
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
