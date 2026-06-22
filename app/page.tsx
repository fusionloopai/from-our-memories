import { readFileSync } from 'fs'
import { join } from 'path'
import Slideshow from '@/components/Slideshow'

// Force dynamic so edits to metadata/categories appear immediately in dev
export const dynamic = 'force-dynamic'

interface Slide {
  file: string
  category: string
  title?: string
  tags?: string[]
}

interface Chapter {
  key: string
  label: string
}

interface PhotoMeta {
  title?: string
  tags?: string[]
  lastRotation?: string
}

interface Metadata {
  tags: string[]
  photos: Record<string, PhotoMeta>
}

interface CategoriesData {
  chapters: Chapter[]
  slides: Slide[]
}

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    return fallback
  }
}

export default function Home() {
  const { chapters, slides: rawSlides } = readJson<CategoriesData>(
    join(process.cwd(), 'data', 'categories.json'),
    { chapters: [], slides: [] }
  )

  const metadata = readJson<Metadata>(
    join(process.cwd(), 'data', 'metadata.json'),
    { tags: [], photos: {} }
  )

  // Merge per-photo metadata into each slide
  const slides: Slide[] = rawSlides.map(slide => ({
    ...slide,
    title: metadata.photos[slide.file]?.title,
    tags: metadata.photos[slide.file]?.tags,
  }))

  return (
    <main>
      <Slideshow
        slides={slides}
        chapters={chapters}
        allTags={metadata.tags}
      />
    </main>
  )
}
