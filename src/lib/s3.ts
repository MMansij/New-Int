import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { decryptKmsValue } from './kms'
import { v4 as uuidv4 } from 'uuid'

export async function uploadToS3(file: File): Promise<string> {
  const accessKeyId = await decryptKmsValue(process.env.ENCRYPTED_ACCESS_KEY_ID!)
  const secretAccessKey = await decryptKmsValue(process.env.ENCRYPTED_SECRET_ACCESS_KEY!)

  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const key = `uploads/${uuidv4()}_${file.name}`
  const bucket = process.env.UPLOAD_BUCKET!

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  )

  const s3Url = `s3://${bucket}/${key}`
  console.log('✅ S3 Upload Successful:', s3Url)

  return s3Url
}
