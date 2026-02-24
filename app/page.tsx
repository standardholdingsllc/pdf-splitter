'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import styles from './page.module.css'

type Status = 'idle' | 'uploading' | 'processing' | 'success' | 'error'

export default function Home() {
  const [status, setStatus] = useState<Status>('idle')
  const [fileName, setFileName] = useState<string>('')
  const [pageCount, setPageCount] = useState<number>(0)
  const [error, setError] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)

  const processFile = async (file: File) => {
    setFileName(file.name)
    setStatus('uploading')
    setError('')
    setProgress(0)

    const formData = new FormData()
    formData.append('pdf', file)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 100)

      setStatus('processing')
      
      const response = await fetch('/api/split', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process PDF')
      }

      const pages = parseInt(response.headers.get('X-Page-Count') || '0', 10)
      setPageCount(pages)

      // Download the zip file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${file.name.replace(/\.pdf$/i, '')}_pages.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      processFile(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: status === 'uploading' || status === 'processing',
  })

  const reset = () => {
    setStatus('idle')
    setFileName('')
    setPageCount(0)
    setError('')
    setProgress(0)
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.logoMark}>
            <svg viewBox="0 0 24 24" fill="none" className={styles.logoIcon}>
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13 3v5a1 1 0 001 1h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className={styles.splitIndicator}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <h1 className={styles.title}>PDF Splitter</h1>
          <p className={styles.subtitle}>
            Upload a PDF and get each page as a separate file, bundled in a zip
          </p>
        </header>

        <div className={styles.card}>
          {status === 'idle' && (
            <div
              {...getRootProps()}
              className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`}
            >
              <input {...getInputProps()} />
              <div className={styles.dropzoneContent}>
                <div className={styles.uploadIcon}>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M7 10l5-5m0 0l5 5m-5-5v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className={styles.dropzoneText}>
                  {isDragActive ? 'Drop your PDF here' : 'Drag & drop a PDF here'}
                </p>
                <span className={styles.dropzoneOr}>or</span>
                <button className={styles.browseButton}>Browse Files</button>
                <p className={styles.dropzoneHint}>PDF files only • Max 50MB</p>
              </div>
            </div>
          )}

          {(status === 'uploading' || status === 'processing') && (
            <div className={styles.processing}>
              <div className={styles.spinner}>
                <svg viewBox="0 0 50 50">
                  <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
                </svg>
              </div>
              <p className={styles.processingFile}>{fileName}</p>
              <p className={styles.processingStatus}>
                {status === 'uploading' ? 'Uploading...' : 'Splitting pages...'}
              </p>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className={styles.success}>
              <div className={styles.successIcon}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className={styles.successTitle}>Split Complete!</h2>
              <p className={styles.successInfo}>
                <span className={styles.mono}>{fileName}</span> was split into{' '}
                <strong>{pageCount}</strong> pages
              </p>
              <p className={styles.successHint}>Your download should start automatically</p>
              <button onClick={reset} className={styles.resetButton}>
                Split Another PDF
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className={styles.error}>
              <div className={styles.errorIcon}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className={styles.errorTitle}>Something went wrong</h2>
              <p className={styles.errorMessage}>{error}</p>
              <button onClick={reset} className={styles.resetButton}>
                Try Again
              </button>
            </div>
          )}
        </div>

        <footer className={styles.footer}>
          <p>Files are processed in your browser and on the server. Nothing is stored.</p>
        </footer>
      </div>
    </main>
  )
}
