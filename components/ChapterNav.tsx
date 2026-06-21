'use client'

interface Chapter {
  key: string
  label: string
}

interface ChapterNavProps {
  chapters: Chapter[]
  currentChapter: string
  onSelect: (key: string) => void
  visible: boolean
}

export default function ChapterNav({ chapters, currentChapter, onSelect, visible }: ChapterNavProps) {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-30 transition-all duration-500 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      {/* Gradient fade */}
      <div className="h-16 bg-gradient-to-t from-[#050d1a] to-transparent pointer-events-none" />

      <div className="bg-[#050d1a]/95 backdrop-blur-sm border-t border-[#f5c842]/20 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide max-w-5xl mx-auto">
          {chapters.map((ch) => (
            <button
              key={ch.key}
              onClick={() => onSelect(ch.key)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide uppercase transition-all duration-200 ${
                currentChapter === ch.key
                  ? 'bg-[#f5c842] text-[#050d1a]'
                  : 'text-[#f5c842]/60 hover:text-[#f5c842] hover:bg-[#f5c842]/10 border border-[#f5c842]/20'
              }`}
            >
              {ch.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
