export type SphereValue = 'all' | 'civic' | 'professional' | 'open-source' | 'personal'

export interface SphereOption {
  value: SphereValue
  label: string
  count?: number
}
