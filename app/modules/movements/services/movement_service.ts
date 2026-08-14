import { inject } from '@adonisjs/core'

import ConflictException from '#exceptions/conflict_exception'
import NotFoundException from '#exceptions/not_found_exception'
import ValidationException from '#exceptions/validation_exception'
import MovementRepository from '#modules/movements/repositories/movement_repository'
import type {
  CreateMovementData,
  MovementListInput,
  UpdateMovementData,
} from '#modules/movements/interfaces/movement_interface'
import type ProcessMovement from '#modules/movements/models/process_movement'

@inject()
export default class MovementService {
  constructor(private movementRepository: MovementRepository) {}

  list(tenantId: number, input: MovementListInput) {
    return this.movementRepository.paginate(tenantId, {
      ...input,
      page: input.page ?? 1,
      per_page: input.per_page ?? 20,
      sort_by: input.sort_by ?? 'occurred_at',
      order: input.order ?? 'desc',
    })
  }

  get(tenantId: number, movementId: number): Promise<ProcessMovement> {
    return this.findOrFail(tenantId, movementId)
  }

  async create(
    tenantId: number,
    processId: number,
    creatorId: number,
    input: CreateMovementData
  ): Promise<ProcessMovement> {
    const process = await this.movementRepository.findProcess(tenantId, processId)
    if (!process) throw new NotFoundException('Process not found')

    if (input.external_id) {
      const existing = await this.movementRepository.findByExternalId(
        tenantId,
        input.source ?? 'manual',
        input.external_id
      )
      if (existing) {
        if (existing.process_id === processId) return existing
        throw new ConflictException(
          'Movement external identifier already belongs to another process'
        )
      }
    }

    return this.movementRepository.create(
      tenantId,
      Number(process.folder_id),
      processId,
      creatorId,
      input
    )
  }

  async update(
    tenantId: number,
    movementId: number,
    actorId: number,
    input: UpdateMovementData
  ): Promise<ProcessMovement> {
    if (Object.keys(input).length === 0) {
      throw new ValidationException('At least one movement field must be provided')
    }
    const movement = await this.findOrFail(tenantId, movementId)
    const process = await this.movementRepository.findProcess(tenantId, movement.process_id)
    if (!process) throw new NotFoundException('Process not found')
    return this.movementRepository.update(movement, Number(process.folder_id), actorId, input)
  }

  async delete(tenantId: number, movementId: number, actorId: number): Promise<void> {
    const movement = await this.findOrFail(tenantId, movementId)
    const process = await this.movementRepository.findProcess(tenantId, movement.process_id)
    if (!process) throw new NotFoundException('Process not found')
    await this.movementRepository.softDelete(movement, Number(process.folder_id), actorId)
  }

  private async findOrFail(tenantId: number, movementId: number): Promise<ProcessMovement> {
    const movement = await this.movementRepository.find(tenantId, movementId)
    if (!movement) throw new NotFoundException('Movement not found')
    return movement
  }
}
