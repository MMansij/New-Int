// src/lib/polly.ts
import 'server-only'
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly'

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

let _polly: PollyClient | null = null
function polly() {
  if (_polly) return _polly
  _polly = new PollyClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  })
  return _polly
}

export async function generateSpeech(text: string) {
  const res = await polly().send(new SynthesizeSpeechCommand({
    OutputFormat: 'mp3',
    Text: text,
    VoiceId: 'Joanna',
  }))
  const chunks: Uint8Array[] = []
  for await (const c of (res.AudioStream as any)) chunks.push(c)
  return new Blob(chunks, { type: 'audio/mpeg' })
}
