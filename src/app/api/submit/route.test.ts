/** @jest-environment node */

// 1) Make 'server-only' inert so the import at the top of route.ts doesn't explode
jest.mock('server-only', () => ({}), { virtual: true })

// 2) Mock ALL AWS helper modules BEFORE importing the route
const uploadToS3Mock = jest.fn(async (_file: File) => 's3://test-bucket/test-key.png')
jest.mock('@/lib/s3', () => ({ uploadToS3: uploadToS3Mock }))

const runTextractMock = jest.fn(async (_s3Url: string) => 'Detected text from Textract')
jest.mock('@/lib/textract', () => ({ runTextract: runTextractMock }))

const runClaudeHaikuMock = jest.fn(async (_ocrText: string) => ({
  document_type: 'Invoice',
  key_value_data: { Amount: '$123.45', Date: '2025-01-01' },
  spoken_summary: 'This is a concise summary.',
}))
jest.mock('@/lib/bedrock', () => ({ runClaudeHaiku: runClaudeHaikuMock }))

const generateSpeechMock = jest.fn(async (_text: string) => ({
  arrayBuffer: async () => new TextEncoder().encode('AUDIO_BINARY').buffer,
}))
jest.mock('@/lib/polly', () => ({ generateSpeech: generateSpeechMock }))

// 3) Minimal Node polyfills (in case your global setup runs in pure Node)
;(globalThis as any).Blob ||= class Blob {
  private _buf: Uint8Array
  type?: string
  constructor(bits?: any[], opts?: any) {
    const chunks = (bits || []).map((b) =>
      typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b)
    )
    const size = chunks.reduce((s, c) => s + c.length, 0)
    this._buf = new Uint8Array(size)
    let off = 0
    for (const c of chunks) { this._buf.set(c, off); off += c.length }
    this.type = opts?.type
  }
  async arrayBuffer() { return this._buf.buffer }
}
;(globalThis as any).File ||= class File extends (globalThis as any).Blob {
  name: string; lastModified: number
  constructor(bits: any[], name: string, opts: any = {}) { super(bits, opts); this.name = name; this.lastModified = opts.lastModified || Date.now() }
}

// 4) Import the route *after* mocks are in place
let POST: (req: any) => Promise<Response>
beforeAll(async () => {
  // dynamic import ensures our mocks apply before module evaluation
  ;({ POST } = await import('./route'))
})

// Helper: build a minimal "request" stub the route expects
function makeReq(formData: FormData) {
  return { formData: async () => formData } as unknown as Parameters<typeof POST>[0]
}

// Silence logs during tests
const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
afterAll(() => { logSpy.mockRestore(); errSpy.mockRestore() })

describe('POST /api/submit', () => {
  it('400 when no file is uploaded', async () => {
    const fd = new FormData()
    const res = await POST(makeReq(fd))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'No file uploaded' })
  })

  it('200 success: returns parsed fields and base64 audio', async () => {
    const fd = new FormData()
    const file = new File([new Blob(['fakeimage'], { type: 'image/png' })], 'doc.png', { type: 'image/png' })
    fd.set('file', file)

    const res = await POST(makeReq(fd))
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json).toMatchObject({
      document_type: 'Invoice',
      key_value_data: { Amount: '$123.45', Date: '2025-01-01' },
      spoken_summary: 'This is a concise summary.',
    })
    expect(typeof json.audio_base64).toBe('string')
    expect(json.audio_base64.length).toBeGreaterThan(0)

    expect(uploadToS3Mock).toHaveBeenCalledWith(file)
    expect(runTextractMock).toHaveBeenCalledWith('s3://test-bucket/test-key.png')
    expect(runClaudeHaikuMock).toHaveBeenCalledWith('Detected text from Textract')
    expect(generateSpeechMock).toHaveBeenCalledWith('This is a concise summary.')
  })

  it('uses summary fallback when spoken_summary is missing', async () => {
    runClaudeHaikuMock.mockResolvedValueOnce({
      document_type: 'Receipt',
      key_value_data: {},
      summary: 'Fallback summary',
    } as any)

    const fd = new FormData()
    fd.set('file', new File([new Blob(['x'])], 'doc.png', { type: 'image/png' }))

    const res = await POST(makeReq(fd))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.spoken_summary).toBe('Fallback summary')
  })

  it('500 error path: Textract throws', async () => {
    runTextractMock.mockRejectedValueOnce(new Error('textract boom'))

    const fd = new FormData()
    fd.set('file', new File([new Blob(['x'])], 'doc.png', { type: 'image/png' }))

    const res = await POST(makeReq(fd))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'textract boom' })

    runTextractMock.mockResolvedValue('Detected text from Textract')
  })
})
