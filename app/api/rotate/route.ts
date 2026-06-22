import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'

const IMAGES_DIR = join(process.cwd(), 'public', 'images')
const METADATA_PATH = join(process.cwd(), 'data', 'metadata.json')

function readMetadata() {
  try {
    return JSON.parse(readFileSync(METADATA_PATH, 'utf8'))
  } catch {
    return { tags: [], photos: {} }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { file, direction } = await req.json()

    if (!file || !direction) {
      return NextResponse.json({ ok: false, error: 'Missing file or direction' }, { status: 400 })
    }

    const filePath = join(IMAGES_DIR, file)

    // Determine rotation angle
    const angle = direction === 'cw' ? 90 : direction === 'ccw' ? -90 : 180

    // Read, rotate, overwrite in place
    const inputBuffer = readFileSync(filePath)
    const rotated = await sharp(inputBuffer)
      .rotate(angle)
      .jpeg({ quality: 85 })
      .toBuffer()

    writeFileSync(filePath, rotated)

    // Record in metadata for audit trail
    const metadata = readMetadata()
    if (!metadata.photos[file]) metadata.photos[file] = {}
    metadata.photos[file].lastRotation = direction
    writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2))

    return NextResponse.json({ ok: true, cacheBust: Date.now() })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
