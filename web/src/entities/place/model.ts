import type { CategoryId } from './categories'

/* Place card shape — subset for list/card surfaces. Mirrors the future
   PlaceCardDto contract (see CONTEXT.md Decisions). Detail fields come later. */
export interface PlaceCard {
  id: number
  no: string
  name: string
  cat: CategoryId
  area: string
  km: number
  saves: number
  tags: string[]
}
