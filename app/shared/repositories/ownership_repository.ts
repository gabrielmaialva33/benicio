import { inject } from '@adonisjs/core'
import { Database } from '@adonisjs/lucid/database'

import type IOwnership from '#shared/interfaces/ownership_interface'

export type OwnedResourceRow = Record<string, unknown>

export type OwnedResourceOptions = {
  limit?: number
  offset?: number
  includeTeam?: boolean
  includeDepartment?: boolean
}

@inject()
export default class OwnershipRepository {
  constructor(private db: Database) {}

  async listOwned(
    userId: number,
    tableName: string,
    ownerField: string,
    options: OwnedResourceOptions
  ): Promise<OwnedResourceRow[]> {
    let query = this.db.from(tableName)

    if (options.includeTeam || options.includeDepartment) {
      const teamIds = options.includeTeam
        ? await this.membershipIds('team_members', 'team_id', userId)
        : []
      const departmentIds = options.includeDepartment
        ? await this.membershipIds('department_members', 'department_id', userId)
        : []

      query = query.where((builder) => {
        builder.where(ownerField, userId)
        if (teamIds.length > 0) {
          builder.orWhereIn(ownerField, (subQuery) => {
            subQuery.from('team_members').whereIn('team_id', teamIds).select('user_id')
          })
        }
        if (departmentIds.length > 0) {
          builder.orWhereIn(ownerField, (subQuery) => {
            subQuery
              .from('department_members')
              .whereIn('department_id', departmentIds)
              .select('user_id')
          })
        }
      })
    } else {
      query = query.where(ownerField, userId)
    }

    if (options.limit) query.limit(options.limit)
    if (options.offset) query.offset(options.offset)
    return query
  }

  async isDirectOwner(
    userId: number,
    tableName: string,
    resourceId: number,
    ownerField: string
  ): Promise<boolean> {
    const record = await this.db
      .from(tableName)
      .where('id', resourceId)
      .where(ownerField, userId)
      .first()
    return record !== null && record !== undefined
  }

  async ownerId(
    tableName: string,
    resourceId: number,
    rule: IOwnership.OwnershipRule
  ): Promise<number | null> {
    const record = await this.db.from(tableName).where('id', resourceId).first()
    if (!record) return null

    const value: unknown = record[rule.ownerField]
    const ownerId = Number(value)
    return Number.isInteger(ownerId) && ownerId > 0 ? ownerId : null
  }

  async transfer(
    currentOwnerId: number,
    newOwnerId: number,
    tableName: string,
    resourceId: number,
    ownerField: string
  ): Promise<boolean> {
    const updated = await this.db
      .from(tableName)
      .where('id', resourceId)
      .where(ownerField, currentOwnerId)
      .update({ [ownerField]: newOwnerId })
    return Array.isArray(updated) ? updated.length > 0 : updated > 0
  }

  async areUsersInSameTeam(firstUserId: number, secondUserId: number): Promise<boolean> {
    return this.shareMembership('team_members', 'team_id', firstUserId, secondUserId)
  }

  async areUsersInSameDepartment(firstUserId: number, secondUserId: number): Promise<boolean> {
    return this.shareMembership('department_members', 'department_id', firstUserId, secondUserId)
  }

  private async shareMembership(
    tableName: string,
    membershipField: string,
    firstUserId: number,
    secondUserId: number
  ): Promise<boolean> {
    const [firstIds, secondIds] = await Promise.all([
      this.membershipIds(tableName, membershipField, firstUserId),
      this.membershipIds(tableName, membershipField, secondUserId),
    ])
    const secondSet = new Set(secondIds)
    return firstIds.some((id) => secondSet.has(id))
  }

  private async membershipIds(
    tableName: string,
    membershipField: string,
    userId: number
  ): Promise<number[]> {
    const rows = await this.db.from(tableName).where('user_id', userId).select(membershipField)
    return rows.map((row) => Number(row[membershipField]))
  }
}
