import { inject } from '@adonisjs/core'

import UsersRepository from '#modules/users/repositories/users_repository'
import IOwnership from '#shared/interfaces/ownership_interface'
import OwnershipRepository, {
  type OwnedResourceOptions,
  type OwnedResourceRow,
} from '#shared/repositories/ownership_repository'

@inject()
export default class OwnershipService {
  private ownershipConfig: IOwnership.OwnershipConfig = {
    users: { resource: 'users', ownerField: 'id', ownerType: 'user', model: 'User' },
    files: { resource: 'files', ownerField: 'owner_id', ownerType: 'user', model: 'File' },
  }

  constructor(
    private ownershipRepository: OwnershipRepository,
    private usersRepository: UsersRepository
  ) {}

  async checkOwnership(data: IOwnership.OwnershipCheck): Promise<boolean> {
    const rule = this.ownershipConfig[data.resource]
    if (!rule) return false

    if (data.context === 'own') {
      return this.checkDirectOwnership(data.userId, data.resource, data.resourceId, rule)
    }
    if (data.context === 'team') {
      return this.checkTeamOwnership(data.userId, data.resource, data.resourceId, rule)
    }
    if (data.context === 'department') {
      return this.checkDepartmentOwnership(data.userId, data.resource, data.resourceId, rule)
    }
    return false
  }

  async getOwnershipLevel(
    userId: number,
    resource: string,
    resourceId: number
  ): Promise<IOwnership.OwnershipLevel | null> {
    const rule = this.ownershipConfig[resource]
    if (!rule) return null

    if (await this.checkDirectOwnership(userId, resource, resourceId, rule)) {
      return IOwnership.OwnershipLevel.OWNER
    }
    if (await this.checkTeamOwnership(userId, resource, resourceId, rule)) {
      return IOwnership.OwnershipLevel.TEAM_MEMBER
    }
    if (await this.checkDepartmentOwnership(userId, resource, resourceId, rule)) {
      return IOwnership.OwnershipLevel.DEPARTMENT_MEMBER
    }
    if (await this.hasCollaborationPermissions(userId, resource, resourceId)) {
      return IOwnership.OwnershipLevel.COLLABORATOR
    }
    return null
  }

  getUserOwnedResources(
    userId: number,
    resource: string,
    options: OwnedResourceOptions = {}
  ): Promise<OwnedResourceRow[]> {
    const rule = this.ownershipConfig[resource]
    if (!rule) return Promise.resolve([])
    return this.ownershipRepository.listOwned(userId, resource, rule.ownerField, options)
  }

  async transferOwnership(
    currentOwnerId: number,
    newOwnerId: number,
    resource: string,
    resourceId: number
  ): Promise<boolean> {
    const rule = this.ownershipConfig[resource]
    if (!rule) return false
    if (!(await this.checkDirectOwnership(currentOwnerId, resource, resourceId, rule))) return false
    if (!(await this.usersRepository.findBy('id', newOwnerId))) return false

    return this.ownershipRepository.transfer(
      currentOwnerId,
      newOwnerId,
      resource,
      resourceId,
      rule.ownerField
    )
  }

  addOwnershipRule(resource: string, rule: IOwnership.OwnershipRule): void {
    this.ownershipConfig[resource] = rule
  }

  private async checkDirectOwnership(
    userId: number,
    resource: string,
    resourceId: number,
    rule: IOwnership.OwnershipRule
  ): Promise<boolean> {
    if (rule.customCheck) return rule.customCheck(userId, resourceId)
    return this.ownershipRepository.isDirectOwner(userId, resource, resourceId, rule.ownerField)
  }

  private async checkTeamOwnership(
    userId: number,
    resource: string,
    resourceId: number,
    rule: IOwnership.OwnershipRule
  ): Promise<boolean> {
    if (await this.checkDirectOwnership(userId, resource, resourceId, rule)) return true
    const ownerId = await this.ownershipRepository.ownerId(resource, resourceId, rule)
    return ownerId
      ? this.ownershipRepository.areUsersInSameTeam(userId, ownerId)
      : Promise.resolve(false)
  }

  private async checkDepartmentOwnership(
    userId: number,
    resource: string,
    resourceId: number,
    rule: IOwnership.OwnershipRule
  ): Promise<boolean> {
    if (await this.checkTeamOwnership(userId, resource, resourceId, rule)) return true
    const ownerId = await this.ownershipRepository.ownerId(resource, resourceId, rule)
    return ownerId
      ? this.ownershipRepository.areUsersInSameDepartment(userId, ownerId)
      : Promise.resolve(false)
  }

  private async hasCollaborationPermissions(
    _userId: number,
    _resource: string,
    _resourceId: number
  ): Promise<boolean> {
    return false
  }
}
