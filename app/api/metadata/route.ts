import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'

const METADATA_PATH = join(process.cwd(), 'data', 'metadata.json')

function readMetadata() {
  try {
    return JSON.parse(readFileSync(METADATA_PATH, 'utf8'))
  } catch {
    return { tags: [], photos: {} }
  }
}

export async function GET() {
  return NextResponse.json(readMetadata())
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { file, title, tags, newTag } = body

    const metadata = readMetadata()

    // Add a new global tag if provided
    if (newTag && !metadata.tags.includes(newTag)) {
      metadata.tags.push(newTag)
      metadata.tags.sort()
    }

    // Update per-photo metadata
    if (file) {
      if (!metadata.photos[file]) metadata.photos[file] = {}
      if (title !== undefined) metadata.photos[file].title = title
      if (tags !== undefined) metadata.photos[file].tags = tags
    }

    writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2))
    return NextResponse.json({ ok: true, metadata })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
