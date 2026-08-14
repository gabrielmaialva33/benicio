import type { QueryClientContract, TransactionClientContract } from '@adonisjs/lucid/types/database'

/** Reuses a surrounding test transaction and owns one in normal CLI execution. */
export function withinSeedTransaction<T>(
  client: QueryClientContract,
  callback: (trx: TransactionClientContract) => Promise<T>
): Promise<T> {
  if (client.isTransaction) {
    return callback(client as TransactionClientContract)
  }

  return client.transaction(callback)
}
