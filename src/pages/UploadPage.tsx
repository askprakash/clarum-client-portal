import { useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { portalService } from '../services/portalService'
import type { DocumentCategory } from '../types'

const uploadCategories: Array<DocumentCategory | 'Other'> = [
  'Tax Returns',
  'Organizers',
  'Financial Statements',
  'Payroll',
  'Correspondence',
  'Other',
]

type SelectedFile = {
  id: string
  file: File
}

export function UploadPage() {
  const [category, setCategory] = useState<(typeof uploadCategories)[number]>('Correspondence')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<SelectedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
    }))

    setFiles((current) => {
      const existing = new Set(current.map((item) => item.id))
      return [...current, ...incoming.filter((item) => !existing.has(item.id))]
    })
    setSubmitted(false)
    setError('')
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      addFiles(event.target.files)
      event.target.value = ''
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(false)
    if (event.dataTransfer.files.length > 0) {
      addFiles(event.dataTransfer.files)
    }
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((item) => item.id !== id))
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (files.length === 0) return
    setBusy(true)
    setError('')
    try {
      for (const item of files) {
        await portalService.uploadDocument(item.file, category)
      }
      setSubmitted(true)
      setFiles([])
      setNotes('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Upload failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Secure transfer</p>
          <h1>Upload documents</h1>
          <p className="lede">
            Send supporting files to your CLARUM engagement team. Files are stored
            only after the portal verifies your sign-in.
          </p>
        </div>
      </div>

      {submitted && (
        <div className="banner" role="status">
          Files were uploaded to your PRC Analytics document library.
        </div>
      )}
      {error && <p role="alert">{error}</p>}

      <article className="card card--narrow">
        <form className="upload-form" onSubmit={(event) => void onSubmit(event)}>
          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
              {uploadCategories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Notes for CLARUM (optional)</span>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Period, entity, or anything we should know"
            />
          </label>

          <label
            className={isDragging ? 'dropzone is-dragging' : 'dropzone'}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
          >
            <input type="file" multiple onChange={onInputChange} />
            <strong>Drop files here</strong>
            <span className="muted">or choose files from your computer</span>
          </label>

          {files.length > 0 && (
            <ul className="file-list">
              {files.map((item) => (
                <li key={item.id}>
                  <div>
                    <p>{item.file.name}</p>
                    <p className="muted">{Math.max(1, Math.round(item.file.size / 1024))} KB</p>
                  </div>
                  <button type="button" className="btn btn--ghost" onClick={() => removeFile(item.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={files.length === 0 || busy}>
              {busy ? 'Uploading…' : 'Submit files'}
            </button>
          </div>
        </form>
      </article>
    </section>
  )
}
