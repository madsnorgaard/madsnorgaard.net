// Shapes shared between the /lab pages and their server routes.

export interface NobelRow {
  id: string
  name: string
  year: number
  cat: string            // Physics, Chemistry, Physiology or Medicine, Literature, Peace, Economic Sciences
  born: string | null    // birth country, today's name
  won: string | null     // affiliation country at award time, today's name (null for most Peace/Literature)
  gender: string | null
}
