import app from '@adonisjs/core/services/app'
import { defineConfig, services } from '@adonisjs/drive'
import env from '#start/env'

const defaultDisk = env.get('DRIVE_DISK')
const r2Key = env.get('R2_KEY', '')
const r2Secret = env.get('R2_SECRET', '')
const r2Bucket = env.get('R2_BUCKET', '')
const r2Endpoint = env.get('R2_ENDPOINT')

if (
  defaultDisk === 'r2' &&
  (!r2Key.trim() || !r2Secret.trim() || !r2Bucket.trim() || !r2Endpoint?.trim())
) {
  throw new Error('R2_KEY, R2_SECRET, R2_BUCKET, and R2_ENDPOINT are required for DRIVE_DISK=r2')
}

const driveConfig = defineConfig({
  default: defaultDisk,

  /**
   * The services object can be used to configure multiple file system
   * services each using the same or a different driver.
   */
  services: {
    fs: services.fs({
      location: app.makePath('storage'),
      serveFiles: true,
      routeBasePath: '/uploads',
      visibility: 'private',
    }),
    s3: services.s3({
      credentials: {
        accessKeyId: env.get('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY', ''),
      },
      region: env.get('AWS_REGION'),
      bucket: env.get('S3_BUCKET', ''),
      visibility: 'public',
    }),
    r2: services.s3({
      credentials: {
        accessKeyId: r2Key,
        secretAccessKey: r2Secret,
      },
      region: 'auto',
      bucket: r2Bucket,
      endpoint: r2Endpoint,
      visibility: 'private',
      supportsACL: false,
    }),
    spaces: services.s3({
      credentials: {
        accessKeyId: env.get('SPACES_KEY', ''),
        secretAccessKey: env.get('SPACES_SECRET', ''),
      },
      region: env.get('SPACES_REGION'),
      bucket: env.get('SPACES_BUCKET', ''),
      endpoint: env.get('SPACES_ENDPOINT'),
      visibility: 'public',
    }),
    gcs: services.gcs({
      credentials: env.get('GCS_KEY') as any,
      bucket: env.get('GCS_BUCKET', ''),
      visibility: 'public',
    }),
  },
})

export default driveConfig

declare module '@adonisjs/drive/types' {
  export interface DriveDisks extends InferDriveDisks<typeof driveConfig> {}
}
