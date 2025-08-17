// src/lib/textract.ts
import 'server-only'
import {
  TextractClient,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
} from '@aws-sdk/client-textract'

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

let _tx: TextractClient | null = null
function textract() {
  if (_tx) return _tx
  _tx = new TextractClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  })
  return _tx
}

export async function runTextract(s3Url: string) {
  const [, , bucket, ...parts] = s3Url.split('/')
  const key = parts.join('/')

  const start = await textract().send(new StartDocumentTextDetectionCommand({
    DocumentLocation: { S3Object: { Bucket: bucket, Name: key } },
  }))

  const jobId = start.JobId!
  for (;;) {
    const poll = await textract().send(new GetDocumentTextDetectionCommand({ JobId: jobId }))
    if (poll.JobStatus === 'SUCCEEDED') {
      const lines = (poll.Blocks || [])
        .filter(b => b.BlockType === 'LINE' && b.Text)
        .map(b => b.Text!)
        .join('\n')
      return lines
    }
    if (poll.JobStatus === 'FAILED') throw new Error('Textract job failed')
    await new Promise(r => setTimeout(r, 1200))
  }
}
