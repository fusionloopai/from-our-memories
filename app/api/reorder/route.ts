import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'

const CATEGORIES_PATH = join(process.cwd(), 'data', 'categories.json')

export async function POST(req: NextRequest) {
  try {
    const { slides } = await req.json()

    if (!Array.isArray(slides)) {
      return NextResponse.json({ ok: false, error: 'slides must be an array' }, { status: 400 })
    }

    const data = JSON.parse(readFileSync(CATEGORIES_PATH, 'utf8'))
    data.slides = slides
    writeFileSync(CATEGORIES_PATH, JSON.stringify(data, null, 2))

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
