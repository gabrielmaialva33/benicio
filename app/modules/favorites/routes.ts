import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { apiThrottle } from '#start/limiter'
import IPermission from '#modules/permissions/interfaces/permission_interface'

const FolderFavoritesController = () =>
  import('#modules/favorites/controllers/folder_favorites_controller')
const folderPermission = (action: IPermission.Actions) =>
  middleware.permission({ permissions: `${IPermission.Resources.FOLDERS}.${action}` })
const common = [middleware.auth(), middleware.tenant({ required: true }), apiThrottle]

router
  .get('/api/v1/me/favorites/folders', [FolderFavoritesController, 'index'])
  .use([...common, folderPermission(IPermission.Actions.READ)])
  .as('me.favorites.folders.index')

router
  .get('/api/v1/folders/:folderId/favorite', [FolderFavoritesController, 'check'])
  .where('folderId', /^[0-9]+$/)
  .use([...common, folderPermission(IPermission.Actions.READ)])
  .as('folders.favorite.check')

router
  .put('/api/v1/folders/:folderId/favorite', [FolderFavoritesController, 'store'])
  .where('folderId', /^[0-9]+$/)
  .use([...common, folderPermission(IPermission.Actions.UPDATE)])
  .as('folders.favorite.store')

router
  .patch('/api/v1/folders/:folderId/favorite', [FolderFavoritesController, 'toggle'])
  .where('folderId', /^[0-9]+$/)
  .use([...common, folderPermission(IPermission.Actions.UPDATE)])
  .as('folders.favorite.toggle')

router
  .delete('/api/v1/folders/:folderId/favorite', [FolderFavoritesController, 'destroy'])
  .where('folderId', /^[0-9]+$/)
  .use([...common, folderPermission(IPermission.Actions.UPDATE)])
  .as('folders.favorite.destroy')
