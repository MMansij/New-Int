jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}))
import { S3Client } from '@aws-sdk/client-s3'
import { setAwsEnv } from '../../test/setupAwsEnv'

describe('s3', () => {
  beforeEach(() => setAwsEnv())

  test('uploadToS3 returns something and calls client', async () => {
    const fakeSend = jest.fn().mockResolvedValue({})
    ;(S3Client as unknown as jest.Mock).mockImplementation(() => ({ send: fakeSend }))

    const mod = await import('../s3')
    const upload =
      (mod as any).uploadToS3 ||
      (mod as any).putObject ||
      (mod as any).default

    expect(upload).toBeTruthy()

    // create a "file-like" object with arrayBuffer()
    const fakeFile = {
      name: 'audio.mp3',
      type: 'audio/mpeg',
      async arrayBuffer() {
        return new TextEncoder().encode('hello-audio')
      },
    } as any

    const out = await (typeof upload === 'function'
      ? upload(fakeFile, 'bucket', 'key.mp3', 'audio/mpeg')
      : upload(fakeFile, 'bucket', 'key.mp3', 'audio/mpeg'))

    expect(fakeSend).toHaveBeenCalled()
    expect(out).toBeDefined()
  })
})
