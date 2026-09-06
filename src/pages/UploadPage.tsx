import { useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'

const uploadCategories = [
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
  const [category, setCategory] = useState(uploadCategories[0])
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<SelectedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [submitted, setSubmitted] = useState(false)

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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (files.length === 0) {
      return
    }
    setSubmitted(true)
    setFiles([])
    setNotes('')
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Secure transfer</p>
          <h1>Upload documents</h1>
          <p className="lede">
            Send supporting files to your CLARUM engagement team. Uploads remain
            on this device until Azure and SharePoint are connected.
          </p>
        </div>
      </div>

      {submitted && (
        <div className="banner" role="status">
          Files were recorded locally. They will be stored in SharePoint after the
          Microsoft Graph connection is in place.
        </div>
      )}

      <article className="card card--narrow">
        <form className="upload-form" onSubmit={onSubmit}>
          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
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
            <button type="submit" className="btn btn--primary" disabled={files.length === 0}>
              Submit files
            </button>
          </div>
        </form>
      </article>
    </section>
  )
}
