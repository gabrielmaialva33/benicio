import { inject } from '@adonisjs/core'

import NotFoundException from '#exceptions/not_found_exception'
import FolderFavoriteRepository from '#modules/favorites/repositories/folder_favorite_repository'

@inject()
export default class FolderFavoriteService {
  constructor(private favoriteRepository: FolderFavoriteRepository) {}

  list(tenantId: number, userId: number) {
    return this.favoriteRepository.list(tenantId, userId)
  }

  isFavorite(tenantId: number, userId: number, folderId: number) {
    return this.favoriteRepository.exists(tenantId, userId, folderId)
  }

  async add(tenantId: number, userId: number, folderId: number): Promise<void> {
    await this.requireFolder(tenantId, folderId)
    await this.favoriteRepository.add(tenantId, userId, folderId)
  }

  async remove(tenantId: number, userId: number, folderId: number): Promise<void> {
    await this.requireFolder(tenantId, folderId)
    await this.favoriteRepository.remove(tenantId, userId, folderId)
  }

  async toggle(tenantId: number, userId: number, folderId: number): Promise<boolean> {
    const isFavorite = await this.isFavorite(tenantId, userId, folderId)
    if (isFavorite) {
      await this.remove(tenantId, userId, folderId)
      return false
    }
    await this.add(tenantId, userId, folderId)
    return true
  }

  private async requireFolder(tenantId: number, folderId: number): Promise<void> {
    if (!(await this.favoriteRepository.findFolder(tenantId, folderId))) {
      throw new NotFoundException('Folder not found')
    }
  }
}
