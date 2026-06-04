import { useState } from 'react'
import type { AppItem } from '../types'

type Size = 'sm' | 'md' | 'lg'

const sizeClass: Record<Size, string> = {
  sm: 'w-8 h-8 text-lg rounded-[9px]',
  md: 'w-10 h-10 text-xl rounded-[9px]',
  lg: 'w-11 h-11 text-2xl rounded-[11px]'
}

export function AppIcon({ item, size = 'md' }: { item: AppItem; size?: Size }) {
  const [failed, setFailed] = useState(false)
  const cls = sizeClass[size]

  if (!item.iconDataUrl || failed) {
    return (
      <div
        className={`${cls} flex items-center justify-center shadow-md`}
        style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))' }}
      >
        {item.icon}
      </div>
    )
  }

  return (
    <img
      src={item.iconDataUrl}
      alt=""
      className={`${cls} object-contain`}
      onError={() => setFailed(true)}
    />
  )
}
