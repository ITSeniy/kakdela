import { S3Client } from '@aws-sdk/client-s3'

import { env } from '../env.js'

/**
 * S3-клиент для MinIO. В dev'е смотрит на `http://localhost:9000`, в проде —
 * на тот же endpoint, что задан в `S3_ENDPOINT`. `forcePathStyle: true`
 * обязателен для MinIO: bucket идёт частью пути (`/kakdela/<key>`), а не
 * sub-domain'ом — иначе presigned URL'ы будут указывать на несуществующий
 * `kakdela.localhost:9000`.
 */
export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
})

export const S3_BUCKET = env.S3_BUCKET
export const S3_EMOJI_BUCKET = env.S3_EMOJI_BUCKET
export const S3_ENDPOINT = env.S3_ENDPOINT

export function emojiPublicUrl(key: string): string {
  return `${S3_ENDPOINT}/${S3_EMOJI_BUCKET}/${key}`
}
