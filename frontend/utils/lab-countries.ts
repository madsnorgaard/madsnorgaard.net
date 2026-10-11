// Map Nobel API country names (today's names, English) onto the Natural Earth
// names used in public/lab/world.json. Anything not listed is matched as-is
// after dropping a leading "the " and any "(...)" note.

const ALIASES: Record<string, string> = {
  'usa': 'United States of America',
  'united states': 'United States of America',
  'scotland': 'United Kingdom',
  'england': 'United Kingdom',
  'wales': 'United Kingdom',
  'northern ireland': 'United Kingdom',
  'czech republic': 'Czechia',
  'bosnia and herzegovina': 'Bosnia and Herz.',
  'north macedonia': 'Macedonia',
  'democratic republic of the congo': 'Dem. Rep. Congo',
  'republic of the congo': 'Congo',
  'ivory coast': "Côte d'Ivoire",
  'east timor': 'Timor-Leste',
  // A label point on the map; the API spells it both ways.
  'guadeloupe island': 'Guadeloupe',
  'guadeloupe, france': 'Guadeloupe',
  'tibet': 'China',
  // Part of the Kingdom of Denmark; too small to draw at this scale anyway.
  'faroe islands': 'Denmark',
  'swaziland': 'eSwatini',
  'eswatini': 'eSwatini',
  'central african republic': 'Central African Rep.',
  'dominican republic': 'Dominican Rep.',
}

export function toMapName(apiName: string | null): string | null {
  if (!apiName) return null
  const clean = apiName.replace(/\s*\(.*?\)\s*/g, ' ').replace(/^the\s+/i, '').trim()
  return ALIASES[clean.toLowerCase()] ?? clean
}
