// src/lib/bedrock.ts
import 'server-only'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

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
const MODEL_ID = need('BEDROCK_MODEL_ID')

let _br: BedrockRuntimeClient | null = null
function bedrock() {
  if (_br) return _br
  _br = new BedrockRuntimeClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  })
  return _br
}

export async function runClaudeHaiku(rawOCRText: string) {
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              `You are an expert document parsing assistant.\n` +
              `1) Identify document type.\n` +
              `2) Return key-value data JSON.\n` +
              `3) Provide a short spoken summary.\n\n` +
              `Return: {"document_type": "...", "key_value_data": {...}, "spoken_summary": "..."}` +
              `\n\nOCR:\n${rawOCRText}`,
          },
        ],
      },
    ],
    max_tokens: 1000,
  }

  const res = await bedrock().send(new InvokeModelCommand({
    modelId: MODEL_ID,
    body: JSON.stringify(payload),
    contentType: 'application/json',
    accept: 'application/json',
  }))

  const raw = new TextDecoder().decode(res.body as Uint8Array)
  const base = JSON.parse(raw)
  const textBlock = base?.content?.[0]?.text ?? '{}'
  const clean = textBlock.replace(/[\u0000-\u001F]+/g, '')
  try {
    return JSON.parse(clean)
  } catch {
    return { document_type: 'Unknown', key_value_data: {}, spoken_summary: 'No summary found.' }
  }
}
