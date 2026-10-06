'use client'

import { CATEGORY_EMOJIS } from '@/lib/category-display'
import { CATEGORY_LABELS, CATEGORY_VALUES, type Category } from '@/types/restaurant'

interface CategorySelectorProps {
  value: Category
  onChange: (category: Category) => void
}

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  return (
    <fieldset className="steps-category-group">
      <legend className="sr-only">음식 테마</legend>
      <div className="steps-theme-tiles">
        {CATEGORY_VALUES.map((category) => (
          <button
            aria-pressed={value === category}
            className={`steps-theme-tile${value === category ? ' is-active' : ''}`}
            key={category}
            onClick={() => onChange(category)}
            type="button"
          >
            <span aria-hidden="true">{CATEGORY_EMOJIS[category]}</span>
            <strong>{CATEGORY_LABELS[category]}</strong>
          </button>
        ))}
      </div>
    </fieldset>
  )
}
