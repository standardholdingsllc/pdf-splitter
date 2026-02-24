# PDF Splitter

A simple web tool to split PDF files into individual pages, packaged as a downloadable zip file.

## Features

- Drag & drop PDF upload
- Splits each page into a separate PDF file
- Downloads all pages as a zip archive
- Clean, modern UI
- Works on Vercel

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/pdf-splitter)

Or deploy manually:

1. Push this code to a GitHub repository
2. Import the project in Vercel
3. Deploy!

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- Next.js 14
- TypeScript
- pdf-lib (PDF manipulation)
- JSZip (zip file creation)
- react-dropzone (file upload)
