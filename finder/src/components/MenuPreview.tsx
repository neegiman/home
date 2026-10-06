import {
  formatMenuCalories,
  formatMenuPrice,
  getMenuSourceLabel,
} from '@/lib/menu-info'
import type { RestaurantMenu } from '@/types/restaurant'

interface MenuPreviewProps {
  limit?: number
  menus: RestaurantMenu[]
  tone?: 'light' | 'dark' | 'fortune'
}

export function MenuPreview({
  limit = 1,
  menus,
  tone = 'light',
}: MenuPreviewProps) {
  const visibleMenus = menus.slice(0, limit)

  if (visibleMenus.length === 0) {
    return null
  }

  return (
    <span className={`menu-preview menu-preview--${tone}`}>
      {visibleMenus.map((menu, index) => (
        <span className="menu-preview-item" key={menu.id}>
          <small>{index === 0 ? '대표 메뉴' : '추천 메뉴'}</small>
          <strong>{menu.name}</strong>
          <span>
            {formatMenuPrice(menu.priceWon)} · {formatMenuCalories(menu)}
          </span>
        </span>
      ))}
      <small className="menu-preview-source">
        {getMenuSourceLabel(visibleMenus[0])} · 실제 정보와 다를 수 있어요
      </small>
    </span>
  )
}
