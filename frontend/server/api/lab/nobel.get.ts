// GET /api/lab/nobel
// One row per Nobel prize awarded to a person. See server/utils/lab-nobel.ts.

export default defineEventHandler((event) =>
  loadNobelRows(useRuntimeConfig(event).nobelApiBase as string),
)
