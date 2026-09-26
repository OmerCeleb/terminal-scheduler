'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

export function Card({ children, className = '', ...rest }: HTMLMotionProps<'div'> & { children: ReactNode }) {
  return (
    <motion.div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: 'var(--surface-1)', border: '1px solid var(--line)', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-start justify-between gap-3">
      <div>
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--pn-blue)' }}>{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--ink)' }}>{title}</h1>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{subtitle}</p>}
      </div>
      {action}
    </motion.div>
  )
}

export function IconBadge({ children, tone = 'blue', size = 36 }: { children: ReactNode; tone?: 'blue' | 'yellow' | 'rested' | 'normal' | 'loaded' | 'muted'; size?: number }) {
  const map = {
    blue: ['var(--pn-blue-soft)', 'var(--pn-blue)'],
    yellow: ['rgba(255,204,0,0.18)', 'var(--pn-yellow-ink)'],
    rested: ['var(--f-rested-bg)', 'var(--f-rested)'],
    normal: ['var(--f-normal-bg)', 'var(--f-normal)'],
    loaded: ['var(--f-loaded-bg)', 'var(--f-loaded)'],
    muted: ['var(--surface-2)', 'var(--ink-2)'],
  } as const
  const [bg, fg] = map[tone]
  return (
    <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: size, height: size, background: bg, color: fg }}>
      {children}
    </div>
  )
}

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
      <div className="mx-auto mb-4 w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: 'var(--pn-blue-soft)', color: 'var(--pn-blue)' }}>
        {icon}
      </div>
      <p className="font-semibold" style={{ color: 'var(--ink)' }}>{title}</p>
      {hint && <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>{hint}</p>}
    </motion.div>
  )
}

export function PrimaryButton({ children, className = '', ...rest }: HTMLMotionProps<'button'> & { children: ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 ${className}`}
      style={{ background: 'linear-gradient(135deg, var(--pn-blue-strong) 0%, var(--pn-blue) 100%)' }}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

export function FabButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.92 }} onClick={onClick} aria-label={open ? 'Stäng' : 'Lägg till'}
      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white" style={{ background: 'var(--pn-blue)' }}>
      <motion.svg animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </motion.svg>
    </motion.button>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3 rounded-xl border-2 text-base outline-none transition-colors ${props.className ?? ''}`}
      style={{ borderColor: 'var(--pn-blue-line)', background: 'var(--surface-1)', color: 'var(--ink)', ...props.style }}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--pn-blue)'; props.onFocus?.(e) }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--pn-blue-line)'; props.onBlur?.(e) }}
    />
  )
}
