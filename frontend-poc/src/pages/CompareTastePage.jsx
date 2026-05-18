import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { buildApiUrl } from '../lib/apiBase'

function getCompareTasteUrl() {
  return buildApiUrl('/src/compare_taste.php')
}

function getLogoutUrl() {
  return buildApiUrl('/src/logout.php')
}

function getLocalFallbackUrl(url) {
  try {
    const parsed = new URL(url, window.location.origin)
    const isLocalBackend =
      parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    if (!isLocalBackend) {
      return null
    }

    let swappedPath = parsed.pathname
    if (swappedPath === '/foodies' || swappedPath.startsWith('/foodies/')) {
      swappedPath = swappedPath.replace(/^\/foodies(\/|$)/, '/s26-foodies$1')
    } else if (
      swappedPath === '/s26-foodies' ||
      swappedPath.startsWith('/s26-foodies/')
    ) {
      swappedPath = swappedPath.replace(/^\/s26-foodies(\/|$)/, '/foodies$1')
    } else {
      return null
    }

    return `${parsed.origin}${swappedPath}${parsed.search}`
  } catch {
    return null
  }
}

async function fetchWithLocalFallback(url, options) {
  try {
    return await fetch(url, options)
  } catch (primaryError) {
    const fallbackUrl = getLocalFallbackUrl(url)
    if (fallbackUrl) {
      return fetch(fallbackUrl, options)
    }
    throw primaryError
  }
}

export default function CompareTastePage() {
  const navigate = useNavigate()
  const { friendId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sharedRestaurants, setSharedRestaurants] = useState([])
  const [sharedTags, setSharedTags] = useState([])

  const averageRating = useMemo(() => {
    if (!sharedRestaurants.length) {
      return 0
    }
    const validRatings = sharedRestaurants
      .map(r => Number(r.user_rating) || Number(r.global_rating) || 0)
      .filter(r => r > 0)
    if (!validRatings.length) return 0
    const total = validRatings.reduce((sum, r) => sum + r, 0)
    return total / validRatings.length
  }, [sharedRestaurants])

  useEffect(() => {
    async function loadComparison() {
      if (!friendId) {
        setError('Missing friend id.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const response = await fetchWithLocalFallback(getCompareTasteUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ friend_id: friendId }),
        })

        if (response.status === 401) {
          localStorage.removeItem('isLoggedIn')
          navigate('/login', { replace: true })
          return
        }

        const data = await response.json().catch(() => null)

        if (!response.ok || !data?.success) {
          setError(data?.message || 'Unable to compare taste right now.')
          setSharedRestaurants([])
          setSharedTags([])
          setLoading(false)
          return
        }

        setSharedRestaurants(Array.isArray(data.shared_restaurants) ? data.shared_restaurants : [])
        setSharedTags(Array.isArray(data.shared_tags) ? data.shared_tags : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to compare taste right now.')
        setSharedRestaurants([])
        setSharedTags([])
      } finally {
        setLoading(false)
      }
    }

    loadComparison()
  }, [friendId, navigate])

  async function handleLogout() {
    try {
      await fetchWithLocalFallback(getLogoutUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
    } catch {
      // continue logout locally
    } finally {
      localStorage.removeItem('isLoggedIn')
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="compare-taste-page">
      <NavBar onLogout={handleLogout} />
      <main className="compare-taste-main">
        <section className="compare-header-card">
          <p className="compare-kicker">Taste Match</p>
          <h1>Compare Taste</h1>
          <p className="compare-subtitle">Read-only view of what you and your friend already overlap on.</p>
          <Link className="compare-back-link" to={`/profile/${friendId}`}>Back to Profile</Link>
        </section>

        {loading && <p className="compare-info">Loading taste comparison...</p>}
        {!loading && error && <p className="compare-error">{error}</p>}

        {!loading && !error && (
          <div className="compare-grid">
            <section className="compare-card">
              <h2>Shared Restaurants</h2>
              {!sharedRestaurants.length ? (
                <p className="compare-empty">No shared restaurants yet.</p>
              ) : (
                <ul className="compare-list">
                  {sharedRestaurants.map((restaurant) => {
                    const userRating = restaurant.user_rating ? Number(restaurant.user_rating) : null
                    const friendRating = restaurant.friend_rating ? Number(restaurant.friend_rating) : null
                    const globalRating = Number(restaurant.global_rating) || Number(restaurant.rating) || 0
                    const displayRating = userRating || globalRating
                    const ratingDelta = displayRating - averageRating
                    const sign = ratingDelta > 0 ? '+' : ''
                    return (
                      <li key={restaurant.id || restaurant.name} className="compare-list-item">
                        <div>
                          <p className="compare-item-title">{restaurant.name}</p>
                          <p className="compare-item-meta">
                            You: {userRating ? `${userRating.toFixed(1)} / 5` : 'N/A'} | Friend: {friendRating ? `${friendRating.toFixed(1)} / 5` : 'N/A'}
                          </p>
                          <p className="compare-item-meta">Global: {globalRating.toFixed(1)} / 5</p>
                        </div>
                        <span className={`compare-rating-diff ${ratingDelta >= 0 ? 'up' : 'down'}`}>
                          {sign}{ratingDelta.toFixed(1)} vs avg
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="compare-card">
              <h2>Shared Tags</h2>
              {!sharedTags.length ? (
                <p className="compare-empty">No shared tags yet.</p>
              ) : (
                <ul className="compare-tags">
                  {sharedTags.map((tagEntry) => (
                    <li key={tagEntry.tag} className="compare-tag-pill">
                      <span>{tagEntry.tag}</span>
                      <strong>x{tagEntry.strength}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>

      <style>{`
        .compare-taste-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #f4fbf3 0%, #f8f9fc 100%);
        }

        .compare-taste-main {
          max-width: 980px;
          margin: 0 auto;
          padding: 20px 16px 32px;
        }

        .compare-header-card {
          background: #ffffff;
          border: 1px solid #dce7dd;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .compare-kicker {
          margin: 0 0 4px;
          color: #1f9d55;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-size: 0.75rem;
        }

        .compare-header-card h1 {
          margin: 0;
          font-size: 1.65rem;
        }

        .compare-subtitle {
          margin-top: 8px;
          color: #556;
        }

        .compare-back-link {
          display: inline-block;
          margin-top: 8px;
          color: #1f9d55;
          font-weight: 600;
          text-decoration: none;
        }

        .compare-back-link:hover {
          text-decoration: underline;
        }

        .compare-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .compare-card {
          background: #fff;
          border: 1px solid #dce7dd;
          border-radius: 16px;
          padding: 16px;
        }

        .compare-card h2 {
          margin: 0 0 12px;
          font-size: 1.1rem;
        }

        .compare-list,
        .compare-tags {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 10px;
        }

        .compare-list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 1px solid #e8ecef;
          border-radius: 12px;
          background: #fbfdfb;
        }

        .compare-item-title {
          margin: 0;
          font-weight: 700;
        }

        .compare-item-meta {
          margin: 4px 0 0;
          color: #5a6472;
          font-size: 0.92rem;
        }

        .compare-rating-diff {
          font-weight: 700;
          white-space: nowrap;
        }

        .compare-rating-diff.up {
          color: #15803d;
        }

        .compare-rating-diff.down {
          color: #b91c1c;
        }

        .compare-tag-pill {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 999px;
          border: 1px solid #d8e3d9;
          background: #f5faf5;
          text-transform: capitalize;
        }

        .compare-empty,
        .compare-info {
          margin: 0;
          color: #5a6472;
        }

        .compare-error {
          margin: 0;
          color: #b91c1c;
          font-weight: 600;
        }

        @media (min-width: 768px) {
          .compare-taste-main {
            padding: 28px 20px 36px;
          }

          .compare-grid {
            grid-template-columns: 1.2fr 0.8fr;
          }
        }
      `}</style>
    </div>
  )
}
