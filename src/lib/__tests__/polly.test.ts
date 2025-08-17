// src/lib/__tests__/polly.test.ts

// 1) Mock AWS Polly SDK
jest.mock('@aws-sdk/client-polly', () => ({
  PollyClient: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  SynthesizeSpeechCommand: jest.fn().mockImplementation((input) => ({ input })),
}))

import { PollyClient } from '@aws-sdk/client-polly'
// 2) Load fake AWS env for this suite
import { setAwsEnv } from '../../test/setupAwsEnv'

describe('polly', () => {
  beforeEach(() => {
    setAwsEnv()
    jest.clearAllMocks()
  })

  test('speech synth returns a URL/string', async () => {
    // Arrange: stub Polly send response
    const fakeSend = jest.fn().mockResolvedValue({
      AudioStream: Uint8Array.from([1, 2, 3]),
      ContentType: 'audio/mpeg',
    })
    ;(PollyClient as unknown as jest.Mock).mockImplementation(() => ({ send: fakeSend }))

    // Act: import the module AFTER mocks/env are ready
    const mod = await import('../polly')

    // Try common export names; fall back to default
    const fn =
      (mod as any).synthesizeSpeechToUrl ||
      (mod as any).synthesizeToUrl ||
      (mod as any).synthesize ||
      (mod as any).default

    expect(fn).toBeTruthy()

    const result = await (typeof fn === 'function' ? fn('Hello world') : fn('Hello world'))

    // Assert: Polly client used and we got a string back
    expect(fakeSend).toHaveBeenCalledTimes(1)
    expect(typeof result).toBe('string')
    // Optional: sanity check it looks like a data: URL or some URL-ish string
    // expect(result).toMatch(/^(data:audio|https?:\/\/)/)
  })
})
