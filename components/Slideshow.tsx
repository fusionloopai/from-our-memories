'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import ChapterNav from './ChapterNav'
import PhotoEditor from './PhotoEditor'
import ReorderMode from './ReorderMode'

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

interface SlideshowProps {
  slides: Slide[]
  chapters: Chapter[]
  allTags: string[]
}

const AUTO_ADVANCE_MS = 5000

export default function Slideshow({ slides: initialSlides, chapters, allTags: initialTags }: SlideshowProps) {
  const [slides, setSlides] = useState<Slide[]>(initialSlides)
  const [allTags, setAllTags] = useState<string[]>(initialTags)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [showNav, setShowNav] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [showReorder, setShowReorder] = useState(false)
  const [fade, setFade] = useState(true)
  const [pageInput, setPageInput] = useState('')
  const [isTypingPage, setIsTypingPage] = useState(false)
  const [cacheBust, setCacheBust] = useState<Record<string, number>>({})
  const [rotating, setRotating] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentSlide = slides[index]
  const currentChapter = chapters.find(c => c.key === currentSlide?.category)

  const chapterStart = useCallback((key: string) => {
    const i = slides.findIndex(s => s.category === key)
    return i >= 0 ? i : 0
  }, [slides])

  const goTo = useCallback((newIndex: number) => {
    setFade(false)
    setTimeout(() => {
      setIndex(Math.max(0, Math.min(newIndex, slides.length - 1)))
      setFade(true)
    }, 250)
  }, [slides.length])

  const advance = useCallback(() => {
    goTo(index < slides.length - 1 ? index + 1 : 0)
  }, [index, slides.length, goTo])

  const retreat = useCallback(() => {
    goTo(index > 0 ? index - 1 : slides.length - 1)
  }, [index, slides.length, goTo])

  // Auto-advance (paused while typing page number or in editor/reorder)
  useEffect(() => {
    if (!playing || isTypingPage || showReorder) return
    timerRef.current = setTimeout(advance, AUTO_ADVANCE_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, advance, isTypingPage, showReorder])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showReorder) return
      // Don't intercept when typing in an input inside the editor
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); advance() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); retreat() }
      if (e.key === 'Home') { e.preventDefault(); goTo(0) }
      if (e.key === 'p' || e.key === 'P') setPlaying(p => !p)
      if (e.key === 'Escape') { setShowNav(false); setShowEditor(false) }
      if (e.key === 'e' || e.key === 'E') setShowEditor(ed => !ed)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [advance, retreat, goTo, showReorder])

  const handleMouseMove = useCallback(() => {
    setShowNav(true)
    if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current)
    navTimeoutRef.current = setTimeout(() => {
      if (!showEditor) setShowNav(false)
    }, 3000)
  }, [showEditor])

  // Keep nav visible when editor is open
  useEffect(() => {
    if (showEditor) setShowNav(true)
  }, [showEditor])

  const handleClick = useCallback(() => {
    if (!showEditor) advance()
  }, [advance, showEditor])

  const handleChapterSelect = useCallback((key: string) => {
    goTo(chapterStart(key))
    setShowNav(false)
  }, [goTo, chapterStart])

  // Page number jump
  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const num = parseInt(pageInput)
      if (!isNaN(num) && num >= 1 && num <= slides.length) {
        goTo(num - 1)
      }
      setPageInput('')
      setIsTypingPage(false)
      ;(e.target as HTMLInputElement).blur()
    }
    if (e.key === 'Escape') {
      setPageInput('')
      setIsTypingPage(false)
      ;(e.target as HTMLInputElement).blur()
    }
  }

  // --- Photo metadata handlers ---
  const updateSlideMeta = useCallback((file: string, updates: Partial<Slide>) => {
    setSlides(prev => prev.map(s => s.file === file ? { ...s, ...updates } : s))
  }, [])

  const handleTitleChange = useCallback(async (title: string) => {
    if (!currentSlide) return
    updateSlideMeta(currentSlide.file, { title })
    await fetch('/api/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: currentSlide.file, title }),
    })
  }, [currentSlide, updateSlideMeta])

  const handleTagsChange = useCallback(async (tags: string[]) => {
    if (!currentSlide) return
    updateSlideMeta(currentSlide.file, { tags })
    await fetch('/api/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: currentSlide.file, tags }),
    })
  }, [currentSlide, updateSlideMeta])

  const handleNewTag = useCallback(async (tag: string) => {
    setAllTags(prev => [...new Set([...prev, tag])].sort())
    await fetch('/api/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newTag: tag }),
    })
  }, [])

  const handleRotate = useCallback(async (direction: 'cw' | 'ccw') => {
    if (!currentSlide || rotating) return
    setRotating(true)
    try {
      const res = await fetch('/api/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: currentSlide.file, direction }),
      })
      const data = await res.json()
      if (data.ok) {
        setCacheBust(prev => ({ ...prev, [currentSlide.file]: data.cacheBust }))
      }
    } finally {
      setRotating(false)
    }
  }, [currentSlide, rotating])

  const handleReorderSave = useCallback((newSlides: Slide[]) => {
    setSlides(newSlides)
    setShowReorder(false)
  }, [])

  if (slides.length === 0) {
    return (
      <div className="fixed inset-0 bg-[#0a1628] flex items-center justify-center">
        <div className="text-center text-[#f5c842]/60">
          <p className="text-2xl font-bold mb-4">No photos yet</p>
          <p className="text-sm">Run <code className="bg-white/10 px-2 py-1 rounded">python scripts/process-images.py</code> then</p>
          <p className="text-sm mt-1"><code className="bg-white/10 px-2 py-1 rounded">python scripts/categorize.py</code></p>
        </div>
      </div>
    )
  }

  const imageSrc = currentSlide
    ? `/images/${encodeURIComponent(currentSlide.file)}${cacheBust[currentSlide.file] ? `?v=${cacheBust[currentSlide.file]}` : ''}`
    : ''

  return (
    <>
      <div
        className="fixed inset-0 bg-[#0a1628] cursor-pointer select-none"
        onMouseMove={handleMouseMove}
        onTouchStart={handleMouseMove}
        onClick={handleClick}
      >
        {/* Slide image */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}
        >
          {currentSlide && (
            <Image
              src={imageSrc}
              alt={currentSlide.title || currentSlide.file.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')}
              fill
              className="object-contain"
              priority
              sizes="100vw"
              unoptimized
            />
          )}
        </div>

        {/* Photo title overlay (bottom-left, above chapter nav) */}
        {currentSlide?.title && (
          <div className="absolute bottom-20 left-6 z-20 pointer-events-none">
            <p className="text-white font-semibold text-base drop-shadow-lg">{currentSlide.title}</p>
          </div>
        )}

        {/* Top overlay */}
        <div
          className={`absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent px-6 pt-5 pb-10 transition-opacity duration-300 ${showNav ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="flex items-center justify-between max-w-5xl mx-auto gap-4">
            {/* Left: chapter + skip-to-start */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Skip to beginning */}
              <button
                onClick={(e) => { e.stopPropagation(); goTo(0) }}
                title="Skip to beginning (Home)"
                className="text-white/50 hover:text-[#f5c842] text-sm transition-colors flex-shrink-0"
              >
                ⏮
              </button>
              <span className="text-[#f5c842] text-xs font-bold tracking-widest uppercase truncate">
                {currentChapter?.label ?? ''}
              </span>
            </div>

            {/* Right: page jump + play + edit + reorder */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Page number input */}
              <div className="flex items-center gap-1 text-white/50 text-xs" onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={isTypingPage ? pageInput : String(index + 1)}
                  onFocus={() => { setIsTypingPage(true); setPageInput('') }}
                  onBlur={() => { setIsTypingPage(false); setPageInput('') }}
                  onChange={e => setPageInput(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={handlePageInputKeyDown}
                  className="w-12 bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-white text-xs text-center focus:outline-none focus:border-[#f5c842]/50 transition-colors"
                />
                <span>/ {slides.length}</span>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); setPlaying(p => !p) }}
                className="text-white/60 hover:text-[#f5c842] text-xs font-semibold tracking-wider uppercase transition-colors"
              >
                {playing ? '⏸' : '▶'}
              </button>

              {/* Edit button */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowEditor(ed => !ed) }}
                title="Edit photo (E)"
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  showEditor
                    ? 'bg-[#f5c842] text-[#050d1a] border-[#f5c842]'
                    : 'text-white/50 hover:text-[#f5c842] border-white/20 hover:border-[#f5c842]/30'
                }`}
              >
                ✎ Edit
              </button>

              {/* Reorder button */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowReorder(true) }}
                title="Reorder photos"
                className="text-xs px-2 py-1 rounded border border-white/20 hover:border-[#f5c842]/30 text-white/50 hover:text-[#f5c842] transition-colors"
              >
                ⠿ Reorder
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2 max-w-5xl mx-auto">
            <div className="h-[2px] bg-white/10 rounded-full">
              <div
                className="h-full bg-[#f5c842] rounded-full transition-all duration-300"
                style={{ width: `${((index + 1) / slides.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Left/right arrows */}
        <button
          className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 text-white/70 hover:bg-[#f5c842] hover:text-[#050d1a] transition-all duration-200 text-xl ${showNav ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => { e.stopPropagation(); retreat() }}
        >
          ‹
        </button>
        <button
          className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 text-white/70 hover:bg-[#f5c842] hover:text-[#050d1a] transition-all duration-200 text-xl ${showNav ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => { e.stopPropagation(); advance() }}
        >
          ›
        </button>

        {/* Photo editor panel */}
        <PhotoEditor
          file={currentSlide?.file ?? ''}
          title={currentSlide?.title ?? ''}
          tags={currentSlide?.tags ?? []}
          allTags={allTags}
          visible={showEditor}
          onTitleChange={handleTitleChange}
          onTagsChange={handleTagsChange}
          onNewTag={handleNewTag}
          onRotate={handleRotate}
          rotating={rotating}
        />

        {/* Chapter navigation */}
        <ChapterNav
          chapters={chapters}
          currentChapter={currentSlide?.category ?? ''}
          onSelect={handleChapterSelect}
          visible={showNav}
        />
      </div>

      {/* Reorder mode (full-screen overlay) */}
      {showReorder && (
        <ReorderMode
          slides={slides}
          chapters={chapters}
          onSave={handleReorderSave}
          onClose={() => setShowReorder(false)}
        />
      )}
    </>
  )
}
