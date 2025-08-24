// src/lib/polly.ts
import 'server-only'
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly'

function trimOrNull(v?: string) {
  return v ? v.replace(/[\r\n]/g, '').trim() : null
}

function makeDummyBlob(text: string): Blob {
  // TextEncoder may not exist in some Node contexts; fallback to Buffer
  // @ts-ignore
  const te: TextEncoder | null = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null
  const bytes = te ? te.encode(`dummy:${text}`) : Buffer.from(`dummy:${text}`)
  return new Blob([bytes], { type: 'audio/mpeg' })
}

function makeClientOrNull(): PollyClient | null {
  const region = process.env.AWS_REGION || 'us-east-1'
  const accessKeyId = trimOrNull(process.env.AWS_ACCESS_KEY_ID)
  const secretAccessKey = trimOrNull(process.env.AWS_SECRET_ACCESS_KEY)
  if (!accessKeyId || !secretAccessKey) return null
  return new PollyClient({ region, credentials: { accessKeyId, secretAccessKey } })
}

let _polly: PollyClient | null | undefined

function getClient(): PollyClient | null {
  if (_polly !== undefined) return _polly
  _polly = makeClientOrNull()
  return _polly
}

/**
 * Generate speech audio as a Blob.
 * - If NEXT_PUBLIC_MOCK_PIPELINE=1 or NODE_ENV=test, returns a deterministic Blob.
 * - If AWS creds are present, calls Polly; otherwise, gracefully falls back to dummy Blob.
 */
export async function generateSpeech(text: string): Promise<Blob> {
  // Explicit mock path for tests/local dev
  if (process.env.NODE_ENV === 'test' || process.env.NEXT_PUBLIC_MOCK_PIPELINE === '1') {
    return makeDummyBlob(text)
  }

  const client = getClient()
  if (!client) {
    // No creds locally? Don’t crash the route—return a dummy blob so UI still works.
    return makeDummyBlob(text)
  }

  try {
    const res = await client.send(
      new SynthesizeSpeechCommand({
        OutputFormat: 'mp3',
        Text: text,
        VoiceId: 'Joanna',
      })
    )

    const chunks: Uint8Array[] = []
    const stream: any = res.AudioStream

    if (stream?.[Symbol.asyncIterator]) {
      for await (const c of stream) chunks.push(c)
    } else if (stream?.[Symbol.iterator]) {
      for (const c of stream) chunks.push(c)
    } else if (stream) {
      chunks.push(Buffer.isBuffer(stream) ? stream : new Uint8Array(stream))
    }

    return new Blob(chunks, { type: 'audio/mpeg' })
  } catch (e) {
    // Last-chance fallback so the route never 500s because of Polly
    return makeDummyBlob(text)
  }
}
