'use client'

import { useId } from 'react'

import { RADIUS_VALUES, type Radius } from '@/types/restaurant'

interface RadiusSelectorProps {
  value: Radius
  onChange: (radius: Radius) => void
}

export function RadiusSelector({ value, onChange }: RadiusSelectorProps) {
  const selectId = useId()

  return (
    <div className="steps-radius-line">
      <label htmlFor={selectId}>얼마나 가까운 곳으로 갈까요?</label>
      <select
        aria-label="검색 범위 · 직선 반경"
        id={selectId}
        onChange={(event) => {
          const nextRadius = Number(event.target.value)
          if (RADIUS_VALUES.includes(nextRadius as Radius)) onChange(nextRadius as Radius)
        }}
        value={value}
      >
        {RADIUS_VALUES.map((radius) => (
          <option key={radius} value={radius}>
            직선 반경 {radius < 1000 ? `${radius}m` : `${radius / 1000}km`}
          </option>
        ))}
      </select>
    </div>
  )
}
