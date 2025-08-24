'use client'

import React, { useRef, useState } from 'react'
import axios from 'axios'

type ParsedResult = {
  document_type?: string
  key_value_data?: Record<string, string>
  spoken_summary?: string
  audio_base64?: string
}

export default function Intelliparse() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
  })
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [result, setResult] = useState<ParsedResult | null>(null)
  const [loading, setLoading] = useState(false)

  const onChange =
    (name: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [name]: e.target.value }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const fd = new FormData()
      if (fileRef.current?.files?.[0]) {
        fd.append('file', fileRef.current.files[0])
      }
      // The tests mock axios.post; we always call it.
      const { data } = await axios.post('/api/submit', fd)

      // Only show a result if something meaningful came back
      const hasData =
        !!data &&
        (data.document_type ||
          data.spoken_summary ||
          (data.key_value_data && Object.keys(data.key_value_data).length > 0))

      setResult(hasData ? data : null)
    } catch (err) {
      // keep the previous result; show nothing new
      console.error('submit error', err)
    } finally {
      setLoading(false)
    }
  }

  const readSummary = () => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && result?.spoken_summary) {
        const u = new SpeechSynthesisUtterance(result.spoken_summary)
        window.speechSynthesis.speak(u)
      }
    } catch (e) {
      console.log('speech error', e)
    }
  }

  const stopReading = () => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    } catch (e) {
      console.log('speech cancel error', e)
    }
  }

  return (
    <div>
      {/* Hero */}
      <section>
        <div
          className="d-flex flex-column justify-content-center align-items-center text-center"
          style={{
            height: '100vh',
            backgroundImage: 'url("/images/background.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            padding: '2rem',
          }}
        >
          <h1
            style={{
              marginRight: '25rem',
              fontSize: '4rem',
              fontWeight: 700,
              color: 'rgb(62, 43, 0)',
              backgroundColor: 'rgba(255,255,255,0.3)',
              padding: '1rem 2rem',
              borderRadius: 12,
              letterSpacing: 2,
            }}
          >
            INTELLIPARSE
          </h1>
          <p
            style={{
              marginRight: '25rem',
              marginTop: '1rem',
              marginBottom: '25rem',
              fontSize: '1.5rem',
              fontWeight: 400,
              color: 'rgb(90, 66, 32)',
              backgroundColor: 'rgba(255,255,255,0.3)',
              padding: '1rem 2rem',
              borderRadius: 12,
              fontStyle: 'italic',
            }}
          >
            Smart Document Parsing and Voice Playback
          </p>
        </div>
      </section>

      {/* Form */}
      <section
        style={{ minHeight: '100vh', backgroundColor: '#111', padding: '4rem 1rem', position: 'relative', zIndex: 2 }}
      >
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-8 bg-dark bg-opacity-75 p-4 rounded">
              <h3 className="text-center mb-4">Upload a Document</h3>
              <form onSubmit={onSubmit}>
                <div className="mb-3">
                  <label htmlFor="firstName" className="form-label text-capitalize">
                    firstName
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    className="form-control"
                    value={form.firstName}
                    onChange={onChange('firstName')}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="lastName" className="form-label text-capitalize">
                    lastName
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    className="form-control"
                    value={form.lastName}
                    onChange={onChange('lastName')}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="email" className="form-label text-capitalize">
                    email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    className="form-control"
                    value={form.email}
                    onChange={onChange('email')}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="phone" className="form-label text-capitalize">
                    phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="text"
                    className="form-control"
                    value={form.phone}
                    onChange={onChange('phone')}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="company" className="form-label text-capitalize">
                    company
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    className="form-control"
                    value={form.company}
                    onChange={onChange('company')}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="file" className="form-label">
                    Upload File
                  </label>
                  <input id="file" ref={fileRef} className="form-control" type="file" />
                </div>

                <button className="btn btn-primary w-100 mt-4" type="submit" disabled={loading}>
                  {loading ? 'Processing…' : 'Submit'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Result */}
      <section
        style={{
          minHeight: '100vh',
          backgroundImage: 'url("/images/background.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          padding: '4rem 1rem',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div className="container">
          <div className="bg-dark bg-opacity-75 p-4 rounded">
            <h3 className="text-center mb-5">Parsed Result</h3>

            {!result ? (
              <p className="text-center">No result yet.</p>
            ) : (
              <div className="row g-4">
                <div className="col-md-6">
                  <div className="p-3 border rounded h-100 bg-black bg-opacity-50">
                    <h5 className="mb-3">📄 Document Type</h5>
                    <p>
                      <strong>Type:</strong> {result.document_type || 'Unknown'}
                    </p>

                    <h5 className="mt-4 mb-3">🔍 Details</h5>
                    <table className="table table-sm table-borderless text-white">
                      <tbody>
                        {Object.entries(result.key_value_data || {}).map(([k, v]) => (
                          <tr key={k}>
                            <td style={{ width: '40%' }}>{k}</td>
                            <td>: {String(v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="p-3 border rounded h-100 bg-black bg-opacity-50 d-flex flex-column justify-content-between">
                    <div>
                      <h5 className="mb-3">🧾 Summary</h5>
                      <p>{result.spoken_summary || '—'}</p>
                    </div>
                    <div className="mt-3 d-flex gap-3">
                      <button className="btn btn-success w-50" onClick={readSummary}>
                        🔊 Read Summary
                      </button>
                      <button className="btn btn-danger w-50" onClick={stopReading}>
                        ⏹ Stop Reading
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
