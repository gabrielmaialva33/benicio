import { inject } from '@adonisjs/core'

import NotFoundException from '#exceptions/not_found_exception'
import ValidationException from '#exceptions/validation_exception'
import ActivityRepository from '#modules/activities/repositories/activity_repository'
import type { ActivityListInput } from '#modules/activities/interfaces/activity_interface'

@inject()
export default class ActivityService {
  constructor(private activityRepository: ActivityRepository) {}

  async listForFolder(tenantId: number, folderId: number, input: ActivityListInput) {
    if (!(await this.activityRepository.findFolder(tenantId, folderId))) {
      throw new NotFoundException('Folder not found')
    }
    return this.list(tenantId, { folder_id: folderId }, input)
  }

  async listForProcess(tenantId: number, processId: number, input: ActivityListInput) {
    if (!(await this.activityRepository.findProcess(tenantId, processId))) {
      throw new NotFoundException('Process not found')
    }
    return this.list(tenantId, { process_id: processId }, input)
  }

  private async list(
    tenantId: number,
    scope: { folder_id?: number; process_id?: number },
    input: ActivityListInput
  ) {
    try {
      return await this.activityRepository.list(tenantId, scope, input)
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid activity cursor') {
        throw new ValidationException(error.message)
      }
      throw error
    }
  }
}
