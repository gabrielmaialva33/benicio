import env from '#start/env'
import { defineConfig, drivers, exponentialBackoff } from '@adonisjs/queue'

export default defineConfig({
  default: env.get('QUEUE_DRIVER', 'redis'),

  adapters: {
    redis: drivers.redis({
      connectionName: 'main',
    }),
    sync: drivers.sync(),
  },

  retry: {
    maxRetries: 3,
    backoff: exponentialBackoff(),
  },

  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },

  worker: {
    concurrency: 5,
    idleDelay: '2s',
  },

  locations: ['./app/modules/**/jobs/**/*.{ts,js}'],
})
