// Composable for the live status block

import type { StatusBlock } from '~/types/status'

export function useStatus() {
  const status = useState<StatusBlock | null>('status', () => null)

  async function fetchStatus() {
    status.value = await $fetch<StatusBlock>('/api/status')
    return status.value
  }

  return { status, fetchStatus }
}
