'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Slide {
  file: string
  category: string
  title?: string
}

interface Chapter {
  key: string
  label: string
}

interface ReorderModeProps {
  slides: Slide[]
  chapters: Chapter[]
  onSave: (slides: Slide[]) => void
  onClose: () => void
}

export default function ReorderMode({ slides, chapters, onSave, onClose }: ReorderModeProps) {
  const [items, setItems] = useState<Slide[]>([...slides])
  const [filterChapter, setFilterChapter] = useState<string>('all')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const chapterLabel = (key: string) => chapters.find(c => c.key === key)?.label ?? key

  // Filtered view — but we always drag within the FULL list
  const filtered = filterChapter === 'all'
    ? items
    : items.filter(s => s.category === filterChapter)

  // Map filtered index back to the full-list index
  const fullIndex = (filteredItem: Slide) => items.findIndex(s => s.file === filteredItem.file)

  const handleDragStart = (filteredIdx: number) => {
    setDragIndex(fullIndex(filtered[filteredIdx]))
  }

  const handleDragOver = (e: React.DragEvent, filteredIdx: number) => {
    e.preventDefault()
    const targetFull = fullIndex(filtered[filteredIdx])
    if (dragIndex === null || dragIndex === targetFull) return

    const next = [...items]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(targetFull, 0, moved)
    setItems(next)
    setDragIndex(targetFull)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: items }),
      })
      if (res.ok) onSave(items)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#030810] flex flex-col"
      onClick={e => e.stopPropagation()}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#f5c842]/20 bg-[#050d1a] flex-shrink-0">
        <div>
          <h2 className="text-[#f5c842] font-bold text-lg tracking-wide uppercase">Reorder Photos</h2>
          <p className="text-white/30 text-xs mt-0.5">Drag photos to rearrange. Changes apply within the whole show.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white/50 hover:text-white text-sm border border-white/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-[#f5c842] text-[#050d1a] font-bold text-sm rounded-lg hover:bg-[#f5c842]/80 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Order'}
          </button>
        </div>
      </div>

      {/* Chapter filter */}
      <div className="flex gap-2 px-6 py-3 overflow-x-auto scrollbar-hide border-b border-white/5 flex-shrink-0">
        <button
          onClick={() => setFilterChapter('all')}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${
            filterChapter === 'all'
              ? 'bg-[#f5c842] text-[#050d1a]'
              : 'text-white/40 hover:text-white border border-white/10'
          }`}
        >
          All
        </button>
        {chapters.map(ch => (
          <button
            key={ch.key}
            onClick={() => setFilterChapter(ch.key)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${
              filterChapter === ch.key
                ? 'bg-[#f5c842] text-[#050d1a]'
                : 'text-white/40 hover:text-white border border-white/10'
            }`}
          >
            {ch.label}
          </button>
        ))}
      </div>

      {/* Photo grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {filtered.map((slide, i) => (
            <div
              key={slide.file}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={e => handleDragOver(e, i)}
              onDragEnd={() => setDragIndex(null)}
              className={`relative aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border-2 transition-all ${
                dragIndex === fullIndex(slide)
                  ? 'border-[#f5c842] opacity-50 scale-95'
                  : 'border-transparent hover:border-[#f5c842]/30'
              } bg-white/5`}
            >
              <Image
                src={`/images/${encodeURIComponent(slide.file)}`}
                alt={slide.file}
                fill
                className="object-cover"
                sizes="150px"
                unoptimized
              />
              {/* Overlay with chapter tag */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1">
                <p className="text-white/60 text-[10px] leading-tight truncate">
                  {slide.title || chapterLabel(slide.category)}
                </p>
              </div>
              {/* Drag handle dots */}
              <div className="absolute top-1 right-1 text-white/30 text-xs leading-none">⠿</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
