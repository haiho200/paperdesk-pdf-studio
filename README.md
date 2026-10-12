# Paperdesk PDF Studio

A browser-based PDF workspace for adding text and images, making visual text replacements, and organizing PDF pages.

## Features

- Import PDFs, rename documents, and keep a browser-local library.
- Add, edit, move, and remove text.
- Select existing PDF text and visually replace it, with font-size and style matching where available.
- Add images, drag to move, resize proportionally, and delete.
- Highlight, draw, and visually cover areas.
- Reorder, rotate, duplicate, delete, merge, and extract pages.
- Download revised PDFs.

## Privacy and storage

PDFs are processed on the device and stored in that browser's IndexedDB. There is no document upload server or cross-device synchronization. Download important revisions before clearing browser data or moving to another device.

## Limitations

Text replacement and cover tools overlay the original content. They are not secure redaction. Original text remains underneath. Added text and images are flattened into an image layer in exported PDFs. The editable workspace stays in the original browser. Scanned text needs OCR, which is not included. Unavailable fonts use substitutes.

## Running locally

Serve this directory using a local static web server and open its localhost URL. Opening index.html directly through a file URL is not supported by the PDF renderer.

## Dependencies

- PDF.js 4.10.38 (Apache-2.0)
- pdf-lib 1.17.1 (MIT)
- Google Fonts: DM Sans and Manrope

Third-party license texts are in the repository root.

