import { readFileSync } from 'fs'
import { join } from 'path'
import Slideshow from '@/components/Slideshow'

interface Slide {
  file: string
  category: string
}

interface Chapter {
  key: string
  label: string
}

interface CategoriesData {
  chapters: Chapter[]
  slides: Slide[]
}

function loadCategories(): CategoriesData {
  try {
    const filePath = join(process.cwd(), 'data', 'categories.json')
    const raw = readFileSync(filePath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return { chapters: [], slides: [] }
  }
}

export default function Home() {
  const { chapters, slides } = loadCategories()

  return (
    <main>
      <Slideshow slides={slides} chapters={chapters} />
    </main>
  )
}
