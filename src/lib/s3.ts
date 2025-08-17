// src/lib/s3.ts
import 'server-only'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'

function need(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing ${name} in .env.local`)
  const cleaned = v.replace(/[\r\n]/g, '').trim()
  if (!cleaned) throw new Error(`${name} is empty after cleaning`)
  return cleaned
}

const region = process.env.AWS_REGION || 'us-east-1'
const accessKeyId = need('AWS_ACCESS_KEY_ID')
const secretAccessKey = need('AWS_SECRET_ACCESS_KEY')

let _s3: S3Client | null = null
function s3() {
  if (_s3) return _s3
  _s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  })
  return _s3
}

const safe = (n: string) => (n || 'upload.bin').replace(/[^A-Za-z0-9._-]/g, '_')

export async function uploadToS3(file: File): Promise<string> {
  const bucket = process.env.UPLOAD_BUCKET || 'intelliparse1' // your bucket
  const key = `uploads/${Date.now()}-${crypto.randomUUID()}-${safe(file.name)}`
  const body = Buffer.from(await file.arrayBuffer())

  await s3().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: file.type || 'application/octet-stream',
  }))

  return `s3://${bucket}/${key}`
}
