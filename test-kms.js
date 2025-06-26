const base64 = 'AQICAHgOaJTVllwdPhr/5Eod2buLy1ZD9lxSGQZXRhcAg54CWAEaGRN2GaywdS0vWAuf6x1PAAAAbTBrBgkqhkiG9w0BBwagXjBcAgEAMFcGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMu5sWmfQUwfdORwqiAgEQgCrxvLJwuu5MSOM4II9dR2iGfzJ6EZ+w3wPrdXbEoBpIOKHhzW3KA5eCLQc='

try {
  const buffer = Buffer.from(base64, 'base64')
  const text = buffer.toString('utf-8')

  console.log('\n🔍 Base64 Decoded Text:')
  console.log(text)

  console.log('\n🧪 Buffer Byte Preview:')
  console.log(buffer.slice(0, 10)) // show first 10 bytes
} catch (err) {
  console.error('❌ Base64 Decode Failed:', err)
}
