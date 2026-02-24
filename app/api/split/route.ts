import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const pdfBytes = new Uint8Array(arrayBuffer)
    
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pageCount = pdfDoc.getPageCount()
    
    if (pageCount === 0) {
      return NextResponse.json({ error: 'PDF has no pages' }, { status: 400 })
    }

    const zip = new JSZip()
    const baseName = file.name.replace(/\.pdf$/i, '')
    
    // Split each page into its own PDF
    for (let i = 0; i < pageCount; i++) {
      const newPdf = await PDFDocument.create()
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i])
      newPdf.addPage(copiedPage)
      
      const pageBytes = await newPdf.save()
      const pageNumber = String(i + 1).padStart(String(pageCount).length, '0')
      zip.file(`${baseName}_page_${pageNumber}.pdf`, pageBytes)
    }
    
    const zipBuffer = await zip.generateAsync({ 
      type: 'arraybuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })
    
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${baseName}_pages.zip"`,
        'X-Page-Count': String(pageCount),
      },
    })
  } catch (error) {
    console.error('PDF split error:', error)
    return NextResponse.json(
      { error: 'Failed to process PDF. The file may be corrupted or password-protected.' },
      { status: 500 }
    )
  }
}
