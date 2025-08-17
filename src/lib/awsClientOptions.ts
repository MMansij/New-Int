// src/lib/awsClientOptions.ts
import 'server-only'

function need(name: string) {
  const v = process.env[name]?.trim()
  if (!v) throw new Error(`Missing ${name} in .env.local`)
  return v
}

export const awsClientOptions = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: need('AWS_ACCESS_KEY_ID'),
    secretAccessKey: need('AWS_SECRET_ACCESS_KEY'),
  },
}