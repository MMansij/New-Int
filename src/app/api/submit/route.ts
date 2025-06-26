import { NextRequest, NextResponse } from 'next/server'
import { uploadToS3 } from '@/lib/s3'
import { runTextract } from '@/lib/textract'
import { runClaudeHaiku } from '@/lib/bedrock'
import { generateSpeech } from '@/lib/polly'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  try {
    console.log('🟡 Starting decryption test...')

    // 1. Upload image to S3
    const s3Url = await uploadToS3(file)
    console.log('✅ S3 upload complete:', s3Url)

    // 2. OCR with Textract
    const ocrText = await runTextract(s3Url)
    console.log('🧠 Textract OCR Output:', ocrText)

    // 3. Parse with Claude Haiku
    const parsed = await runClaudeHaiku(ocrText)
    console.log('🧠 Claude Parsed:', parsed)

    // 4. Speech with Polly
    const summary = parsed?.spoken_summary || parsed?.summary || 'No summary found.'
    const audioBlob = await generateSpeech(summary)
    const audioBuffer = await audioBlob.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString('base64')

    // 5. Send response in frontend-expected format
    return NextResponse.json({
      document_type: parsed.document_type || 'Unknown',
      key_value_data: parsed.key_value_data || {},
      spoken_summary: summary,
      audio_base64: audioBase64,
    })
  } catch (err: any) {
    console.error('❌ Error in /api/submit:', err)
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 })
  }
}
