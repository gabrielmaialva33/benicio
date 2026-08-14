import app from '@adonisjs/core/services/app'

import PermissionService from '#modules/permissions/services/permission_service'

/**
 * Rotas candidatas a "início", da mais completa para a mais restrita. A
 * primeira cuja permissão o usuário possui vira o destino padrão dele.
 */
const rotasIniciaisPorPermissao = [
  { rota: '/dashboard', permissao: 'dashboard.read' },
  { rota: '/folders', permissao: 'folders.list' },
  { rota: '/clients', permissao: 'clients.list' },
] as const

/** Rota disponível para qualquer usuário autenticado (perfil + escritórios). */
const rotaDeFallback = '/settings'

/**
 * Resolve para onde mandar o usuário depois do login (e no lugar de um 403).
 *
 * Sem isso, perfis restritos como o cliente/guest caem sempre em `/dashboard`,
 * levam 403 e ficam presos em loop, porque `/login` devolve o autenticado
 * justamente para `/dashboard`.
 */
export async function resolveHomeRoute(userId: number): Promise<string> {
  const permissionService = await app.container.make(PermissionService)

  for (const candidata of rotasIniciaisPorPermissao) {
    const temPermissao = await permissionService.checkUserPermission({
      user_id: userId,
      permission: candidata.permissao,
    })

    if (temPermissao) return candidata.rota
  }

  return rotaDeFallback
}
