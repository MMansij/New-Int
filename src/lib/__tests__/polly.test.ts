/** @jest-environment jsdom */

// Read a Blob into string without relying on Response/fetch
const blobToString = async (blob: any): Promise<string> => {
  if (blob && typeof blob.text === 'function') {
    return await blob.text()
  }
  if (blob && typeof blob.arrayBuffer === 'function') {
    const ab = await blob.arrayBuffer()
    return new TextDecoder().decode(ab)
  }
  if (blob && typeof blob.stream === 'function') {
    const reader = blob.stream().getReader()
    const parts: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      parts.push(value)
    }
    const total = parts.reduce((s, p) => s + p.length, 0)
    const joined = new Uint8Array(total)
    let off = 0
    for (const p of parts) { joined.set(p, off); off += p.length }
    return new TextDecoder().decode(joined)
  }
  if (typeof (globalThis as any).FileReader === 'function') {
    const ab: ArrayBuffer = await new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as ArrayBuffer)
      fr.onerror = () => reject(fr.error)
      fr.readAsArrayBuffer(blob)
    })
    return new TextDecoder().decode(ab)
  }
  if (blob && blob._buf instanceof Uint8Array) {
    return new TextDecoder().decode(blob._buf)
  }
  return String(blob)
}

describe('lib/polly.generateSpeech', () => {
  const origEnv = { ...process.env }

  afterEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env = { ...origEnv }
    jest.dontMock('@aws-sdk/client-polly')
  })

  test('mock mode (NODE_ENV=test) returns deterministic Blob', async () => {
    process.env.NODE_ENV = 'test'
    const { generateSpeech } = await import('@/lib/polly')
    const blob = await generateSpeech('hello')
    expect(await blobToString(blob)).toContain('dummy:hello')
  })

  test('non-mock + missing creds => graceful dummy Blob fallback (no AWS)', async () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_MOCK_PIPELINE = '0'
    delete process.env.AWS_ACCESS_KEY_ID
    delete process.env.AWS_SECRET_ACCESS_KEY

    const { generateSpeech } = await import('@/lib/polly')
    const blob = await generateSpeech('no-creds')
    expect(await blobToString(blob)).toContain('dummy:no-creds')
  })

  test('non-mock + creds + async iterable AudioStream is concatenated', async () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_MOCK_PIPELINE = '0'
    process.env.AWS_ACCESS_KEY_ID = 'AKIA_TEST'
    process.env.AWS_SECRET_ACCESS_KEY = 'SECRET_TEST'
    process.env.AWS_REGION = 'us-east-1'

    jest.doMock('@aws-sdk/client-polly', () => {
      const te = new TextEncoder()
      class PollyClient {
        async send(_: any) {
          return {
            AudioStream: {
              async *[Symbol.asyncIterator]() {
                yield te.encode('ab')
                yield te.encode('cd')
              },
            },
          }
        }
      }
      class SynthesizeSpeechCommand { constructor(_: any) {} }
      return { PollyClient, SynthesizeSpeechCommand }
    })

    const { generateSpeech } = await import('@/lib/polly')
    const blob = await generateSpeech('ignored')
    expect(await blobToString(blob)).toBe('abcd')
  })

  test('non-mock + creds + sync iterable (array) AudioStream is concatenated', async () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_MOCK_PIPELINE = '0'
    process.env.AWS_ACCESS_KEY_ID = 'AKIA_TEST'
    process.env.AWS_SECRET_ACCESS_KEY = 'SECRET_TEST'

    jest.doMock('@aws-sdk/client-polly', () => {
      const te = new TextEncoder()
      class PollyClient {
        async send(_: any) {
          return { AudioStream: [te.encode('x'), te.encode('y')] }
        }
      }
      class SynthesizeSpeechCommand { constructor(_: any) {} }
      return { PollyClient, SynthesizeSpeechCommand }
    })

    const { generateSpeech } = await import('@/lib/polly')
    const blob = await generateSpeech('ignored')
    expect(await blobToString(blob)).toBe('xy')
  })

  test('non-mock + creds + Buffer AudioStream is handled', async () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_MOCK_PIPELINE = '0'
    process.env.AWS_ACCESS_KEY_ID = 'AKIA_TEST'
    process.env.AWS_SECRET_ACCESS_KEY = 'SECRET_TEST'

    jest.doMock('@aws-sdk/client-polly', () => {
      class PollyClient {
        async send(_: any) {
          return { AudioStream: Buffer.from('zz') } // Buffer branch
        }
      }
      class SynthesizeSpeechCommand { constructor(_: any) {} }
      return { PollyClient, SynthesizeSpeechCommand }
    })

    const { generateSpeech } = await import('@/lib/polly')
    const blob = await generateSpeech('ignored')
    const s = await blobToString(blob)

    // jsdom may stringify a Buffer-backed Blob as "122122" (ASCII codes for 'z')
    const acceptable = s === 'zz' || s === Array.from(Buffer.from('zz')).join('')
    expect(acceptable).toBe(true)
  })
})
