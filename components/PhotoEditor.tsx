'use client'

import { useState, useRef, useEffect } from 'react'

interface PhotoEditorProps {
  file: string
  title: string
  tags: string[]
  allTags: string[]
  visible: boolean
  onTitleChange: (title: string) => void
  onTagsChange: (tags: string[]) => void
  onNewTag: (tag: string) => void
  onRotate: (direction: 'cw' | 'ccw') => void
  rotating: boolean
}

export default function PhotoEditor({
  file, title, tags, allTags, visible,
  onTitleChange, onTagsChange, onNewTag, onRotate, rotating
}: PhotoEditorProps) {
  const [localTitle, setLocalTitle] = useState(title)
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync title when slide changes
  useEffect(() => { setLocalTitle(title) }, [title, file])

  // Auto-save title after 800ms of no typing
  const handleTitleChange = (val: string) => {
    setLocalTitle(val)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => onTitleChange(val), 800)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const addTag = (tag: string) => {
    const clean = tag.trim().toLowerCase()
    if (clean && !tags.includes(clean)) {
      onTagsChange([...tags, clean])
    }
    setShowTagDropdown(false)
    setNewTagInput('')
  }

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter(t => t !== tag))
  }

  const createTag = () => {
    const clean = newTagInput.trim().toLowerCase()
    if (!clean) return
    onNewTag(clean)
    addTag(clean)
  }

  const availableTags = allTags.filter(t => !tags.includes(t))
  const displayName = file.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')

  return (
    <div
      className={`fixed bottom-24 right-4 z-40 w-72 bg-[#050d1a]/95 backdrop-blur-sm border border-[#f5c842]/20 rounded-xl shadow-2xl transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-white/10">
        <p className="text-[#f5c842] text-xs font-bold tracking-widest uppercase">Edit Photo</p>
        <p className="text-white/30 text-xs mt-0.5 truncate">{displayName}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Title</label>
          <input
            type="text"
            value={localTitle}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Add a title..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#f5c842]/50 transition-colors"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map(tag => (
              <span
                key={tag}
                className="flex items-center gap-1 bg-[#f5c842]/15 text-[#f5c842] text-xs px-2 py-1 rounded-full border border-[#f5c842]/20"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="text-[#f5c842]/60 hover:text-[#f5c842] leading-none ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
            {/* Add tag button */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowTagDropdown(d => !d)}
                className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-xs px-2 py-1 rounded-full border border-white/10 transition-colors"
              >
                + tag
              </button>
              {showTagDropdown && (
                <div className="absolute bottom-full left-0 mb-1 w-48 bg-[#0a1628] border border-[#f5c842]/20 rounded-lg shadow-xl z-50 overflow-hidden">
                  {availableTags.length > 0 && (
                    <div className="py-1 max-h-32 overflow-y-auto">
                      {availableTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => addTag(tag)}
                          className="w-full text-left px-3 py-1.5 text-white/70 hover:text-white hover:bg-white/5 text-xs transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-white/10 p-2 flex gap-1">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={e => setNewTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') createTag() }}
                      placeholder="New tag..."
                      className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs placeholder-white/20 focus:outline-none focus:border-[#f5c842]/30"
                      autoFocus
                    />
                    <button
                      onClick={createTag}
                      className="bg-[#f5c842] text-[#050d1a] text-xs font-bold px-2 py-1 rounded hover:bg-[#f5c842]/80 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rotate */}
        <div>
          <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Rotate & Save</label>
          <div className="flex gap-2">
            <button
              onClick={() => onRotate('ccw')}
              disabled={rotating}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white/70 hover:text-white text-sm transition-colors disabled:opacity-40"
            >
              ↺ Left
            </button>
            <button
              onClick={() => onRotate('cw')}
              disabled={rotating}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white/70 hover:text-white text-sm transition-colors disabled:opacity-40"
            >
              ↻ Right
            </button>
          </div>
          {rotating && (
            <p className="text-[#f5c842]/60 text-xs mt-1 text-center">Saving rotation...</p>
          )}
        </div>
      </div>
    </div>
  )
}
