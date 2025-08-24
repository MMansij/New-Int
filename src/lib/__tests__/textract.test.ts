// src/lib/__tests__/textract.test.ts

// 1) Mock the AWS SDK that textract.ts actually uses (Start* / Get*)
let sendMock: jest.Mock
jest.mock('@aws-sdk/client-textract', () => {
  sendMock = jest.fn()
  class TextractClient {
    send(...args: any[]) {
      return sendMock(...args)
    }
  }
  class StartDocumentTextDetectionCommand { constructor(public input: any) {} }
  class GetDocumentTextDetectionCommand { constructor(public input: any) {} }
  return {
    TextractClient,
    StartDocumentTextDetectionCommand,
    GetDocumentTextDetectionCommand,
    __m: { sendMock },
  }
})

// 2) Mock S3 upload so extract(file) produces a stable s3 URL
jest.mock('@/lib/s3', () => ({
  uploadToS3: jest.fn(async (_f: File) => 's3://bucket/path/doc.pdf'),
}))

import { setAwsEnv } from '../../test/setupAwsEnv'

describe('textract', () => {
  const origEnv = { ...process.env }

  // Reset module cache so the cached client (_tx) doesn’t leak between tests
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...origEnv }
    setAwsEnv()
    const sdk = require('@aws-sdk/client-textract')
    sdk.__m.sendMock.mockReset()
  })

  test('extract() happy path: start -> poll SUCCEEDED with LINE blocks', async () => {
    const sdk = require('@aws-sdk/client-textract')
    // First call returns JobId; second call returns SUCCEEDED with two LINE blocks
    sdk.__m.sendMock
      .mockResolvedValueOnce({ JobId: 'job-1' })
      .mockResolvedValueOnce({
        JobStatus: 'SUCCEEDED',
        Blocks: [
          { BlockType: 'LINE', Text: 'Hello' },
          { BlockType: 'LINE', Text: 'World' },
        ],
      })

    const { extract } = await import('../textract')
    const file = new File([new Blob(['pdf-bytes'])], 'doc.pdf', { type: 'application/pdf' })

    const out = await extract(file)

    expect(out).toBe('Hello\nWorld')
    expect(sdk.__m.sendMock).toHaveBeenCalledTimes(2)

    // Verify Start* was called with parsed bucket/key from our mocked S3 URL
    const startCmd = sdk.__m.sendMock.mock.calls[0][0]
    expect(startCmd.input.DocumentLocation.S3Object).toEqual({
      Bucket: 'bucket',
      Name: 'path/doc.pdf',
    })
  })

  test('runTextract() invalid s3 URL throws', async () => {
    const { runTextract } = await import('../textract')
    await expect(runTextract('http://not-s3')).rejects.toThrow('Invalid S3 URL')
    await expect(runTextract('s3:///nope')).rejects.toThrow('Invalid S3 URL')
  })

  test('propagates errors when start call rejects', async () => {
    const sdk = require('@aws-sdk/client-textract')
    sdk.__m.sendMock.mockRejectedValueOnce(new Error('textract boom'))

    const { extract } = await import('../textract')
    const file = new File([new Blob(['pdf-bytes'])], 'doc.pdf', { type: 'application/pdf' })

    await expect(extract(file)).rejects.toThrow('textract boom')
    expect(sdk.__m.sendMock).toHaveBeenCalledTimes(1)
  })

  test('failed job status throws "Textract job failed"', async () => {
    const sdk = require('@aws-sdk/client-textract')
    sdk.__m.sendMock
      .mockResolvedValueOnce({ JobId: 'job-1' })
      .mockResolvedValueOnce({ JobStatus: 'FAILED' })

    const { extract } = await import('../textract')
    const file = new File([new Blob(['pdf-bytes'])], 'doc.pdf', { type: 'application/pdf' })

    await expect(extract(file)).rejects.toThrow('Textract job failed')
    expect(sdk.__m.sendMock).toHaveBeenCalledTimes(2)
  })

  test('timeout branch: without ALLOW_FAKE_TEXTRACT -> throws timed out', async () => {
    // NODE_ENV is "test" here, so MAX_POLLS=3, POLL_MS=5 (from your implementation)
    const sdk = require('@aws-sdk/client-textract')
    sdk.__m.sendMock
      .mockResolvedValueOnce({ JobId: 'job-1' }) // start
      // three IN_PROGRESS polls (exhausts limit)
      .mockResolvedValueOnce({ JobStatus: 'IN_PROGRESS' })
      .mockResolvedValueOnce({ JobStatus: 'IN_PROGRESS' })
      .mockResolvedValueOnce({ JobStatus: 'IN_PROGRESS' })

    const { extract } = await import('../textract')
    const file = new File([new Blob(['pdf-bytes'])], 'doc.pdf', { type: 'application/pdf' })

    await expect(extract(file)).rejects.toThrow(/Textract timed out/i)
    expect(sdk.__m.sendMock).toHaveBeenCalledTimes(4)
  })

  test('timeout branch: with ALLOW_FAKE_TEXTRACT=1 -> returns FAKE_TEXTRACT_TEXT', async () => {
    process.env.ALLOW_FAKE_TEXTRACT = '1'
    const sdk = require('@aws-sdk/client-textract')
    sdk.__m.sendMock
      .mockResolvedValueOnce({ JobId: 'job-1' }) // start
      .mockResolvedValueOnce({ JobStatus: 'IN_PROGRESS' })
      .mockResolvedValueOnce({ JobStatus: 'IN_PROGRESS' })
      .mockResolvedValueOnce({ JobStatus: 'IN_PROGRESS' })

    const { extract } = await import('../textract')
    const file = new File([new Blob(['pdf-bytes'])], 'doc.pdf', { type: 'application/pdf' })

    const out = await extract(file)
    expect(out).toBe('FAKE_TEXTRACT_TEXT')
    expect(sdk.__m.sendMock).toHaveBeenCalledTimes(4)
  })
})
