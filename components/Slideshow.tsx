'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import ChapterNav from './ChapterNav'

interface Slide {
  file: string
  category: string
}

interface Chapter {
  key: string
  label: string
}

interface SlideshowProps {
  slides: Slide[]
  chapters: Chapter[]
}

const AUTO_ADVANCE_MS = 5000

export default function Slideshow({ slides, chapters }: SlideshowProps) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [showNav, setShowNav] = useState(false)
  const [fade, setFade] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentSlide = slides[index]
  const currentChapter = chapters.find(c => c.key === currentSlide?.category)

  // Index of first slide in each chapter
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

  // Auto-advance
  useEffect(() => {
    if (!playing) return
    timerRef.current = setTimeout(advance, AUTO_ADVANCE_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, advance])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); advance() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); retreat() }
      if (e.key === 'p' || e.key === 'P') setPlaying(p => !p)
      if (e.key === 'Escape') setShowNav(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [advance, retreat])

  // Show nav on mouse move, hide after 3s idle
  const handleMouseMove = useCallback(() => {
    setShowNav(true)
    if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current)
    navTimeoutRef.current = setTimeout(() => setShowNav(false), 3000)
  }, [])

  const handleClick = useCallback(() => {
    advance()
  }, [advance])

  const handleChapterSelect = useCallback((key: string) => {
    goTo(chapterStart(key))
    setShowNav(false)
  }, [goTo, chapterStart])

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

  return (
    <div
      className="fixed inset-0 bg-[#0a1628] cursor-pointer select-none"
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
      onClick={handleClick}
    >
      {/* Slide image */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}
        key={currentSlide?.file}
      >
        {currentSlide && (
          <Image
            src={`/images/${encodeURIComponent(currentSlide.file)}`}
            alt={currentSlide.file.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')}
            fill
            className="object-contain"
            priority
            sizes="100vw"
          />
        )}
      </div>

      {/* Top overlay: chapter label + progress */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 to-transparent px-6 pt-5 pb-10 transition-opacity duration-300 ${showNav ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <span className="text-[#f5c842] text-xs font-bold tracking-widest uppercase">
            {currentChapter?.label ?? ''}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-white/50 text-xs">
              {index + 1} / {slides.length}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setPlaying(p => !p) }}
              className="text-white/60 hover:text-[#f5c842] text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              {playing ? '⏸ Pause' : '▶ Play'}
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
        className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 text-white/70 hover:bg-[#f5c842] hover:text-[#050d1a] transition-all duration-200 ${showNav ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => { e.stopPropagation(); retreat() }}
      >
        ‹
      </button>
      <button
        className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 text-white/70 hover:bg-[#f5c842] hover:text-[#050d1a] transition-all duration-200 ${showNav ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => { e.stopPropagation(); advance() }}
      >
        ›
      </button>

      {/* Chapter navigation */}
      <ChapterNav
        chapters={chapters}
        currentChapter={currentSlide?.category ?? ''}
        onSelect={handleChapterSelect}
        visible={showNav}
      />
    </div>
  )
}
