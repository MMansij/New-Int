import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' })

export async function runClaudeHaiku(ocrText: string) {
  const prompt = `
You are an intelligent document parser. Given OCR output from any scanned document (such as a driver's license, ID card, passport, transcript, or utility bill), do the following:

1. Identify the document type from the text.
2. Extract all clearly labeled or obvious fields as key-value pairs (like "Name", "DOB", "Address", "ID Number", etc).
3. Generate a clear, spoken-style summary of the document's key information.
4. Return only a JSON object using the following schema:

{
  "document_type": "<inferred document type>",
  "key_value_data": {
    "Field 1": "Value 1",
    "Field 2": "Value 2"
  },
  "spoken_summary": "<a one-paragraph human-readable summary>"
}

Notes:
- Include only fields that are clearly present and confidently labeled.
- Skip unclear or redundant values.
- Be robust to layout issues or spacing problems.
- Respond only with JSON — no explanations, markdown, or commentary.

Here is the OCR text:

"""${ocrText}"""
  `

  const input = {
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1024,
    }),
  }

  const command = new InvokeModelCommand(input)
  const response = await bedrock.send(command)
  const rawBody = await response.body.transformToString()

  try {
    const parsed = JSON.parse(rawBody)
    const content = parsed?.content?.[0]?.text || '{}'

    const jsonStart = content.indexOf('{')
    const jsonEnd = content.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON found')

    const jsonString = content.slice(jsonStart, jsonEnd + 1)
      .replace(/,\s*}/g, '}') // remove trailing commas
      .replace(/,\s*]/g, ']') // remove trailing commas
      .replace(/[\u0000-\u001F]+/g, '') // strip control characters

    return JSON.parse(jsonString)
  } catch (err) {
    console.error('❌ Error parsing Claude response:', err)
    console.log('🪵 Raw Claude body:', rawBody)
    return {
      document_type: 'Unknown',
      key_value_data: {},
      spoken_summary: 'No summary found.',
    }
  }
}
