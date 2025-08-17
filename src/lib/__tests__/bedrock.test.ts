// src/lib/__tests__/bedrock.test.ts

// 1) Mock AWS Bedrock Runtime SDK (v3)
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  InvokeModelCommand: jest.fn().mockImplementation((input) => ({ input })),
}))

import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { setAwsEnv } from '../../test/setupAwsEnv'

describe('bedrock', () => {
  beforeEach(() => {
    setAwsEnv()
    jest.clearAllMocks()
  })

  test('summarize calls model and returns string', async () => {
    // Fake Bedrock response payload your code will parse
    const payload = JSON.stringify({ output_text: 'TL;DR: Hello summary!' })

    // Create a body that supports .arrayBuffer()
    const bodyLike = {
      arrayBuffer: async () => Buffer.from(payload, 'utf8'),
    }

    // Stub client.send to return both `body` and `Body` variants
    const fakeSend = jest.fn().mockResolvedValue({
      body: bodyLike as any,
      Body: bodyLike as any,
      contentType: 'application/json',
    })
    ;(BedrockRuntimeClient as unknown as jest.Mock).mockImplementation(() => ({
      send: fakeSend,
    }))

    // Import after mocks/env are ready
    const mod = await import('../bedrock')

    // Be flexible about the export name
    const summarizeFn =
      (mod as any).summarize ||
      (mod as any).generateSummary ||
      (mod as any).default

    expect(typeof summarizeFn).toBe('function')

    const input = 'Please summarize this text.'
    const out = await summarizeFn(input)

    // Assert: client was invoked
    expect(fakeSend).toHaveBeenCalledTimes(1)
    const firstCallArg = fakeSend.mock.calls[0][0]
    expect(firstCallArg).toHaveProperty('input')
    // The request should include model + some body
    expect(firstCallArg.input).toEqual(
      expect.objectContaining({
        modelId: expect.any(String),
      })
    )

    // Assert: return is a string (ideally what we mocked)
    expect(typeof out).toBe('string')
    // If your code returns the text we mocked:
    // expect(out).toContain('TL;DR: Hello summary!')
  })

  test('propagates Bedrock errors', async () => {
    const fakeSend = jest.fn().mockRejectedValue(new Error('bedrock boom'))
    ;(BedrockRuntimeClient as unknown as jest.Mock).mockImplementation(() => ({
      send: fakeSend,
    }))

    const mod = await import('../bedrock')
    const summarizeFn =
      (mod as any).summarize ||
      (mod as any).generateSummary ||
      (mod as any).default

    await expect(summarizeFn('x')).rejects.toThrow('bedrock boom')
  })
})
