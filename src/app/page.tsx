'use client'

import { ParallaxProvider, Parallax } from 'react-scroll-parallax'
import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

export default function Intelliparse() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
  })

  const [image, setImage] = useState<File | null>(null)
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const synth = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synth.current = window.speechSynthesis
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) setImage(e.target.files[0])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = new FormData()
    Object.entries(formData).forEach(([k, v]) => data.append(k, v))
    if (image) data.append('file', image)
    setLoading(true)
    try {
      const res = await axios.post('/api/submit', data)
      console.log('📦 FULL PAYLOAD FROM BACKEND:', res.data)
      setResponse(res.data)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const readAloud = (text: string) => {
    if (synth.current?.speaking) synth.current.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    synth.current?.speak(utterance)
  }

  const stopAudio = () => {
    synth.current?.cancel()
  }

  return (
    <ParallaxProvider>

      {/* SECTION 1: Introduction */}
      <section>
        <Parallax speed={-20}>
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
            <h1 style={{
              marginRight: '25rem',
              fontSize: '4rem',
              fontWeight: '700',
              color: '#3e2b00',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              padding: '1rem 2rem',
              borderRadius: '12px',
              letterSpacing: '2px',
            }}>
              INTELLIPARSE
            </h1>

            <p style={{
              marginRight: '25rem',
              marginTop: '1rem',
              marginBottom: '25rem',
              fontSize: '1.5rem',
              fontWeight: 400,
              color: '#5a4220',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              padding: '1rem 2rem',
              borderRadius: '12px',
              fontStyle: 'italic',
            }}>
              Smart Document Parsing and Voice Playback
            </p>
          </div>
        </Parallax>
      </section>

      {/* SECTION 2: Input Form */}
      <section
        style={{
          minHeight: '100vh',
          backgroundColor: '#111',
          padding: '4rem 1rem',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-8 bg-dark bg-opacity-75 p-4 rounded">
              <h3 className="text-center mb-4">Upload a Document</h3>
              <form onSubmit={handleSubmit}>
                {['firstName', 'lastName', 'email', 'phone', 'company'].map((field) => (
                  <div className="mb-3" key={field}>
                    <label className="form-label text-capitalize">{field}</label>
                    <input
                      type="text"
                      name={field}
                      className="form-control"
                      onChange={handleChange}
                    />
                  </div>
                ))}
                <div className="mb-3">
                  <label className="form-label">Upload File</label>
                  <input
                    type="file"
                    className="form-control"
                    onChange={handleFileChange}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary w-100 mt-4"
                >
                  Submit
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Result */}
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

            {loading ? (
              <p className="text-center">Processing...</p>
            ) : response && Object.keys(response).length > 0 ? (
              <div className="row g-4">
                {/* Left Column – Document Type + Details */}
                <div className="col-md-6">
                  <div className="p-3 border rounded h-100 bg-black bg-opacity-50">
                    <h5 className="mb-3">📄 Document Type</h5>
                    <p><strong>Type:</strong> {response.document_type}</p>

                    <h5 className="mt-4 mb-3">🔍 Details</h5>
                    {response.key_value_data && Object.keys(response.key_value_data).length > 0 ? (
                      <table className="table table-sm table-borderless text-white">
                        <tbody>
                          {Object.entries(response.key_value_data).map(([key, value]) => (
                            <tr key={key}>
                              <td style={{ width: '40%' }}>{key}</td>
                              <td>: {String(value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-warning">⚠️ No key-value data found.</p>
                    )}
                  </div>
                </div>

                {/* Right Column – Summary + Buttons */}
                <div className="col-md-6">
                  <div className="p-3 border rounded h-100 bg-black bg-opacity-50 d-flex flex-column justify-content-between">
                    <div>
                      <h5 className="mb-3">🧾 Summary</h5>
                      <p>{response.spoken_summary || 'No summary found.'}</p>
                    </div>
                    <div className="mt-3 d-flex gap-3">
                      <button className="btn btn-success w-50" onClick={() => readAloud(response.spoken_summary)}>
                        🔊 Read Summary
                      </button>
                      <button className="btn btn-danger w-50" onClick={stopAudio}>
                        ⏹ Stop Reading
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center">No result yet.</p>
            )}
          </div>
        </div>
      </section>
    </ParallaxProvider>
  )
}
