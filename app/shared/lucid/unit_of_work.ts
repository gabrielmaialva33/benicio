import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/** Single entry point for service-layer transaction orchestration. */
export default class UnitOfWork {
  run<T>(callback: (transaction: TransactionClientContract) => Promise<T>): Promise<T> {
    return db.transaction(callback)
  }
}
