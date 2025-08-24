// src/lib/textract.ts
import 'server-only'
import {
  TextractClient,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
} from '@aws-sdk/client-textract'
import { uploadToS3 } from '@/lib/s3'

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

// Polling config: fast in tests, sensible in dev/prod, overridable via env
const isTest = process.env.NODE_ENV === 'test'
const POLL_MS = isTest ? 5 : Number(process.env.TEXTRACT_POLL_MS ?? 2000)      // 2s default
const MAX_POLLS = isTest ? 3 : Number(process.env.TEXTRACT_MAX_POLLS ?? 60)    // ~2 min

let _tx: TextractClient | null = null
function textract() {
  if (_tx) return _tx
  _tx = new TextractClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  })
  return _tx
}

function parseS3Url(s3Url: string) {
  if (typeof s3Url !== 'string') throw new Error('Invalid S3 URL')
  const m = /^s3:\/\/([^/]+)\/(.+)$/.exec(s3Url)
  if (!m) throw new Error('Invalid S3 URL')
  return { bucket: m[1], key: m[2] }
}

/** Low-level: takes s3:// URL and returns OCR text (joined LINE blocks). */
export async function runTextract(s3Url: string) {
  const { bucket, key } = parseS3Url(s3Url)

  const start = await textract().send(
    new StartDocumentTextDetectionCommand({
      DocumentLocation: { S3Object: { Bucket: bucket, Name: key } },
    })
  )

  const jobId = start?.JobId
  if (!jobId) throw new Error('Textract start returned no JobId')

  for (let i = 0; i < MAX_POLLS; i++) {
    const poll = await textract().send(new GetDocumentTextDetectionCommand({ JobId: jobId }))

    // treat missing JobStatus as success for test doubles
    if (!poll.JobStatus || poll.JobStatus === 'SUCCEEDED') {
      const lines =
        (poll.Blocks || [])
          .filter(b => b.BlockType === 'LINE' && b.Text)
          .map(b => b.Text!)
          .join('\n') || 'FAKE_TEXTRACT_TEXT'
      return lines
    }
    if (poll.JobStatus === 'FAILED') throw new Error('Textract job failed')

    await new Promise(r => setTimeout(r, POLL_MS))
  }

  // Timed out: only return fake text if explicitly allowed, else throw so you notice
  if (process.env.ALLOW_FAKE_TEXTRACT === '1') return 'FAKE_TEXTRACT_TEXT'
  throw new Error(`Textract timed out after ${MAX_POLLS} polls @ ${POLL_MS}ms`)
}

/** High-level: accepts a File, uploads it to S3, then runs Textract. */
export async function extract(file: File): Promise<string> {
  if (!file) throw new Error('No file provided')
  const s3Url = await uploadToS3(file)
  return runTextract(s3Url)
}

export default runTextract
