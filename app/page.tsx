'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'
import styles from './page.module.css'

type Status = 'idle' | 'processing' | 'success' | 'error'

export default function Home() {
  const [status, setStatus] = useState<Status>('idle')
  const [fileName, setFileName] = useState<string>('')
  const [pageCount, setPageCount] = useState<number>(0)
  const [error, setError] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)
  const [progressText, setProgressText] = useState<string>('')

  const processFile = async (file: File) => {
    setFileName(file.name)
    setStatus('processing')
    setError('')
    setProgress(0)
    setProgressText('Reading PDF...')

    try {
      // Read the file
      const arrayBuffer = await file.arrayBuffer()
      const pdfBytes = new Uint8Array(arrayBuffer)
      
      setProgress(10)
      setProgressText('Loading PDF...')
      
      // Load the PDF
      const pdfDoc = await PDFDocument.load(pdfBytes)
      const totalPages = pdfDoc.getPageCount()
      
      if (totalPages === 0) {
        throw new Error('PDF has no pages')
      }

      setPageCount(totalPages)
      setProgress(20)
      setProgressText(`Splitting ${totalPages} pages...`)

      const zip = new JSZip()
      const baseName = file.name.replace(/\.pdf$/i, '')
      
      // Split each page into its own PDF
      for (let i = 0; i < totalPages; i++) {
        const newPdf = await PDFDocument.create()
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [i])
        newPdf.addPage(copiedPage)
        
        const pageBytes = await newPdf.save()
        const pageNumber = String(i + 1).padStart(String(totalPages).length, '0')
        zip.file(`${baseName}_page_${pageNumber}.pdf`, pageBytes)
        
        // Update progress (20% to 80% for splitting)
        const splitProgress = 20 + ((i + 1) / totalPages) * 60
        setProgress(Math.round(splitProgress))
        setProgressText(`Splitting page ${i + 1} of ${totalPages}...`)
      }
      
      setProgress(85)
      setProgressText('Creating zip file...')
      
      // Generate the zip
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      })
      
      setProgress(95)
      setProgressText('Preparing download...')
      
      // Download the zip file
      const url = window.URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${baseName}_pages.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setProgress(100)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      if (err instanceof Error) {
        if (err.message.includes('encrypted') || err.message.includes('password')) {
          setError('This PDF is password-protected and cannot be split.')
        } else if (err.message.includes('Invalid PDF')) {
          setError('This file appears to be corrupted or is not a valid PDF.')
        } else {
          setError(err.message)
        }
      } else {
        setError('An unexpected error occurred')
      }
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
    disabled: status === 'processing',
  })

  const reset = () => {
    setStatus('idle')
    setFileName('')
    setPageCount(0)
    setError('')
    setProgress(0)
    setProgressText('')
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
                <p className={styles.dropzoneHint}>PDF files only • No size limit</p>
              </div>
            </div>
          )}

          {status === 'processing' && (
            <div className={styles.processing}>
              <div className={styles.spinner}>
                <svg viewBox="0 0 50 50">
                  <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
                </svg>
              </div>
              <p className={styles.processingFile}>{fileName}</p>
              <p className={styles.processingStatus}>{progressText}</p>
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
          <p>Files are processed entirely in your browser. Nothing is uploaded.</p>
        </footer>
      </div>
    </main>
  )
}
