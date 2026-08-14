import { inject } from '@adonisjs/core'

import NotFoundException from '#exceptions/not_found_exception'
import ValidationException from '#exceptions/validation_exception'
import HearingRepository from '#modules/hearings/repositories/hearing_repository'
import type {
  CreateHearingData,
  HearingListInput,
  UpdateHearingData,
} from '#modules/hearings/interfaces/hearing_interface'
import type Hearing from '#modules/hearings/models/hearing'

@inject()
export default class HearingService {
  constructor(private hearingRepository: HearingRepository) {}

  list(tenantId: number, input: HearingListInput) {
    return this.hearingRepository.paginate(tenantId, {
      ...input,
      page: input.page ?? 1,
      per_page: input.per_page ?? 10,
      sort_by: input.sort_by ?? 'starts_at',
      order: input.order ?? 'asc',
    })
  }

  async get(tenantId: number, hearingId: number): Promise<Hearing> {
    return this.findOrFail(tenantId, hearingId)
  }

  async create(tenantId: number, creatorId: number, input: CreateHearingData): Promise<Hearing> {
    await this.validate(tenantId, input)
    return this.hearingRepository.create(tenantId, creatorId, input)
  }

  async update(tenantId: number, hearingId: number, input: UpdateHearingData): Promise<Hearing> {
    if (Object.keys(input).length === 0) {
      throw new ValidationException('At least one hearing field must be provided')
    }
    const hearing = await this.findOrFail(tenantId, hearingId)
    await this.validate(tenantId, input, hearing)
    return this.hearingRepository.update(hearing, tenantId, input)
  }

  async delete(tenantId: number, hearingId: number): Promise<void> {
    await this.hearingRepository.softDelete(await this.findOrFail(tenantId, hearingId))
  }

  private async findOrFail(tenantId: number, hearingId: number): Promise<Hearing> {
    const hearing = await this.hearingRepository.find(tenantId, hearingId)
    if (!hearing) throw new NotFoundException('Hearing not found')
    return hearing
  }

  private async validate(
    tenantId: number,
    input: CreateHearingData | UpdateHearingData,
    current?: Hearing
  ): Promise<void> {
    const processId = input.process_id ?? current?.process_id
    if (!processId || !(await this.hearingRepository.findProcess(tenantId, processId))) {
      throw new NotFoundException('Process not found')
    }

    const startsAt = input.starts_at ?? current?.starts_at.toJSDate()
    const endsAt = input.ends_at === undefined ? current?.ends_at?.toJSDate() : input.ends_at
    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new ValidationException('Hearing end must be after its start')
    }

    if (input.attendees) {
      const userIds = input.attendees.map((attendee) => attendee.user_id)
      if (new Set(userIds).size !== userIds.length) {
        throw new ValidationException('Hearing attendees must be unique')
      }
      const members = await this.hearingRepository.usersInTenant(tenantId, userIds)
      if (members.length !== userIds.length) {
        throw new NotFoundException('One or more hearing attendees were not found in tenant')
      }
    }
  }
}
