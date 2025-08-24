// src/lib/__tests__/bedrock.test.ts

// Mock the exact client/command used by the module
let sendMock: jest.Mock
jest.mock('@aws-sdk/client-bedrock-runtime', () => {
  sendMock = jest.fn()
  class BedrockRuntimeClient {
    send(...args: any[]) {
      return sendMock(...args)
    }
  }
  class InvokeModelCommand {
    constructor(public input: any) {}
  }
  return { BedrockRuntimeClient, InvokeModelCommand, __m: { sendMock } }
})

// Use your helper that provides AWS creds (and add MODEL_ID here)
import { setAwsEnv } from '../../test/setupAwsEnv'

describe('lib/bedrock.runClaudeHaiku', () => {
  const origEnv = { ...process.env }

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env = { ...origEnv }
    setAwsEnv()
    process.env.BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'model-test-id'
    // reset shared mock
    const sdk = require('@aws-sdk/client-bedrock-runtime')
    sdk.__m.sendMock.mockReset()
  })

  test('calls Bedrock and returns parsed JSON object from text block', async () => {
    const sdk = require('@aws-sdk/client-bedrock-runtime')

    // Bedrock Messages API–style response
    const returned = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            document_type: 'Invoice',
            key_value_data: { Amount: '$123.45', Date: '2025-01-01' },
            spoken_summary: 'Invoice summary.',
          }),
        },
      ],
    }

    // Encode response body as Uint8Array/Buffer (what TextDecoder expects)
    const bodyBytes = Buffer.from(JSON.stringify(returned), 'utf8')
    sdk.__m.sendMock.mockResolvedValueOnce({
      body: bodyBytes,
      contentType: 'application/json',
    })

    const { runClaudeHaiku } = await import('../bedrock')
    const result = await runClaudeHaiku('OCR text here')

    // Shape + fields
    expect(result).toEqual({
      document_type: 'Invoice',
      key_value_data: { Amount: '$123.45', Date: '2025-01-01' },
      spoken_summary: 'Invoice summary.',
    })

    // Ensure command was constructed with our modelId and body
    const firstArg = sdk.__m.sendMock.mock.calls[0][0]
    expect(firstArg).toBeInstanceOf(require('@aws-sdk/client-bedrock-runtime').InvokeModelCommand)
    expect(firstArg.input).toEqual(
      expect.objectContaining({
        modelId: process.env.BEDROCK_MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
      })
    )
    // Payload sanity
    expect(typeof firstArg.input.body).toBe('string')
    expect(JSON.parse(firstArg.input.body)).toHaveProperty('messages')
  })

  test('strips control characters and still parses JSON', async () => {
    const sdk = require('@aws-sdk/client-bedrock-runtime')

    // Put control chars (\u0001) around JSON to hit the .replace(/[\u0000-\u001F]+/g,'')
    const noisyText =
      '\u0001\u0001' +
      JSON.stringify({
        document_type: 'Receipt',
        key_value_data: { Total: '$9.99' },
        spoken_summary: 'Clean summary.',
      }) +
      '\u0001'

    const returned = { content: [{ type: 'text', text: noisyText }] }
    const bodyBytes = Buffer.from(JSON.stringify(returned), 'utf8')

    sdk.__m.sendMock.mockResolvedValueOnce({ body: bodyBytes, contentType: 'application/json' })

    const { runClaudeHaiku } = await import('../bedrock')
    const result = await runClaudeHaiku('OCR text here')
    expect(result).toEqual({
      document_type: 'Receipt',
      key_value_data: { Total: '$9.99' },
      spoken_summary: 'Clean summary.',
    })
  })

  test('returns fallback object when text is invalid JSON', async () => {
    const sdk = require('@aws-sdk/client-bedrock-runtime')

    const returned = { content: [{ type: 'text', text: 'not-json!!' }] }
    const bodyBytes = Buffer.from(JSON.stringify(returned), 'utf8')
    sdk.__m.sendMock.mockResolvedValueOnce({ body: bodyBytes, contentType: 'application/json' })

    const { runClaudeHaiku } = await import('../bedrock')
    const result = await runClaudeHaiku('OCR text here')
    expect(result).toEqual({
      document_type: 'Unknown',
      key_value_data: {},
      spoken_summary: 'No summary found.',
    })
  })

  test('propagates Bedrock errors', async () => {
    const sdk = require('@aws-sdk/client-bedrock-runtime')
    sdk.__m.sendMock.mockRejectedValueOnce(new Error('bedrock boom'))

    const { runClaudeHaiku } = await import('../bedrock')
    await expect(runClaudeHaiku('x')).rejects.toThrow('bedrock boom')
    expect(sdk.__m.sendMock).toHaveBeenCalledTimes(1)
  })
})
