import { useState, useRef, useEffect } from 'react'

interface Props {
  options: any[]
  value: any
  onChange: (id: any) => void
  getLabel: (item: any) => string
  placeholder?: string
  valueKey?: string
}

export default function SearchSelect({ options, value, onChange, getLabel, placeholder = 'Select…', valueKey = 'id' }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o[valueKey] === value)
  const list = q ? options.filter((o) => getLabel(o).toLowerCase().includes(q.toLowerCase())) : options

  useEffect(() => {
    const h = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const choose = (o: any) => { onChange(o[valueKey]); setOpen(false); setQ('') }

  return (
    <div className="search-select" ref={ref} style={{ position: 'relative' }}>
      <input
        style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
        value={open ? q : (selected ? getLabel(selected) : '')}
        placeholder={placeholder}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0) }}
        onFocus={() => { setOpen(true); setQ('') }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, list.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
          else if (e.key === 'Enter') {
            if (open && list[hi]) { e.preventDefault(); e.stopPropagation(); choose(list[hi]) }
          } else if (e.key === 'Escape') { setOpen(false) }
        }}
      />
      {open && (
        <ul style={{ position: 'absolute', zIndex: 60, top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderTop: 'none', maxHeight: 220, overflow: 'auto', margin: 0, padding: 0, listStyle: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.12)' }}>
          {!list.length && <li style={{ padding: '8px 10px', color: '#94a3b8' }}>No matches</li>}
          {list.map((o, i) => (
            <li
              key={o[valueKey]}
              onMouseDown={() => choose(o)}
              onMouseEnter={() => setHi(i)}
              style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 13, background: i === hi ? '#eef2ff' : '#fff', borderBottom: '1px solid #f1f5f9' }}
            >
              {getLabel(o)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
