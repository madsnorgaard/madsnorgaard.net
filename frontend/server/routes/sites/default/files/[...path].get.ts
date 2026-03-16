// Proxy Drupal file assets: /sites/default/files/* → Drupal backend
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const path = getRouterParam(event, 'path') || ''
  const target = `${config.drupalBaseUrl}/sites/default/files/${path}`

  return proxyRequest(event, target)
})
