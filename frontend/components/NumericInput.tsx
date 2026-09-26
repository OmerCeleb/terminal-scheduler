'use client'

import { forwardRef } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  onEnter?: () => void
  placeholder?: string
  suffix?: string
  allowDecimal?: boolean
  className?: string
  autoFocus?: boolean
}

const NumericInput = forwardRef<HTMLInputElement, Props>(function NumericInput(
  { value, onChange, onEnter, placeholder, suffix, allowDecimal, className = '', autoFocus }, ref
) {
  return (
    <div className={`relative ${className}`}>
      <input
        ref={ref}
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        enterKeyHint={onEnter ? 'next' : 'done'}
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter() } }}
        onChange={(e) => {
          const raw = e.target.value.replace(',', '.')
          const clean = allowDecimal ? raw.replace(/[^0-9.]/g, '') : raw.replace(/[^0-9]/g, '')
          onChange(clean.replace(/^0+(?=\d)/, ''))
        }}
        className="w-full px-4 py-3 rounded-xl border-2 text-base font-semibold outline-none transition-colors text-center"
        style={{ borderColor: 'var(--pn-blue-line)', background: 'var(--surface-1)', color: 'var(--ink)', paddingRight: suffix ? '3rem' : undefined }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--pn-blue)' }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--pn-blue-line)' }}
      />
      {suffix && (
        <span style={{ color: 'var(--ink-3)' }} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  )
})

export default NumericInput
