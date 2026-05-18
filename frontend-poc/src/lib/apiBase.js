export function getApiBaseUrl() {
  const { protocol, hostname, host } = window.location
  const origin = `${protocol}//${host}`

  const envBase = import.meta.env.VITE_API_BASE_URL
  if (typeof envBase === 'string' && envBase.trim()) {
    const trimmedEnvBase = envBase.trim().replace(/\/$/, '')

    // Guard production hosts from accidentally using localhost-only build env values.
    if (hostname === 'aptitude.cse.buffalo.edu' || hostname === 'cattle.cse.buffalo.edu') {
      const envHost = (() => {
        try {
          return new URL(trimmedEnvBase).hostname
        } catch {
          return ''
        }
      })()

      if (envHost !== 'localhost' && envHost !== '127.0.0.1') {
        return trimmedEnvBase
      }
    } else {
      return trimmedEnvBase
    }
  }

  const knownProjectRoots = [
    '/CSE442/2026-Spring/cse-442aj',
    '/foodies',
    '/s26-foodies',
  ]

  const pathname = window.location.pathname || '/'
  const matchedProjectRoot = knownProjectRoots.find((root) =>
    pathname === root || pathname.startsWith(`${root}/`)
  ) || ''

  if (hostname === 'aptitude.cse.buffalo.edu' || hostname === 'cattle.cse.buffalo.edu') {
    return `${origin}/CSE442/2026-Spring/cse-442aj`
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (
      host === 'localhost:5173' ||
      host === '127.0.0.1:5173' ||
      host === 'localhost:5174' ||
      host === '127.0.0.1:5174' ||
      host === 'localhost:4173' ||
      host === '127.0.0.1:4173'
    ) {
      // In Vite dev, use same-origin "/src/*" paths and let vite.proxy map them.
      return ''
    }

    return `${origin}${matchedProjectRoot}`
  }

  return `${origin}${matchedProjectRoot}`
}

export function buildApiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${getApiBaseUrl()}${normalized}`
}
