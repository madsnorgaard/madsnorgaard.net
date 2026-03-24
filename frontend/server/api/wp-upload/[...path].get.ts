// Proxy WordPress media: /wp-content/uploads/* → WordPress backend (internal Docker service)
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const path = getRouterParam(event, 'path') || ''
  const target = `${config.wordpressBaseUrl}/wp-content/uploads/${path}`

  return proxyRequest(event, target)
})
