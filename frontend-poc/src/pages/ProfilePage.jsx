import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { buildApiUrl } from '../lib/apiBase'

const PLACEHOLDER_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>'
)

function getUserProfileFullUrl() {
  return buildApiUrl('/src/get_user_profile_full.php')
}

function getProfileUrl() {
  return buildApiUrl('/src/profile.php')
}

function getLogoutUrl() {
  return buildApiUrl('/src/logout.php')
}

function getUploadAvatarUrl() {
  return buildApiUrl('/src/upload_avatar.php')
}

function getFriendsUrl(search = '') {
  return buildApiUrl(`/src/list_friends.php?search=${encodeURIComponent(search)}`)
}

const ALLOWED_TYPE_MESSAGE = 'Only .jpg, .jpeg, and .png are allowed'
const GENERIC_AVATAR_FAILURE = 'Failed to update profile picture.'

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
    const response = await fetch(url, options)
    if (response.ok || response.status === 401) {
      return response
    }

    const fallbackUrl = getLocalFallbackUrl(url)
    if (fallbackUrl && fallbackUrl !== url) {
      return fetch(fallbackUrl, options)
    }

    return response
  } catch (primaryError) {
    const fallbackUrl = getLocalFallbackUrl(url)
    if (fallbackUrl) {
      return fetch(fallbackUrl, options)
    }
    throw primaryError
  }
}

function resolveAssetUrl(path) {
  if (!path) {
    return PLACEHOLDER_AVATAR
  }

  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return buildApiUrl(normalizedPath)
}

function mapHistoryToRestaurants(history) {
  if (!Array.isArray(history)) {
    return []
  }

  return history.map((item, index) => {
    const restaurantName = String(item?.restaurant ?? item?.name ?? 'Unknown Restaurant')
    const numericRating = Number(item?.rating)
    const hasRating = Number.isFinite(numericRating)

    return {
      id: `${restaurantName}-${index}`,
      name: restaurantName,
      cuisine: 'Recently visited',
      rating: hasRating ? numericRating.toFixed(1) : 'N/A',
      price: hasRating ? `${numericRating.toFixed(1)} ★` : '—',
      image: PLACEHOLDER_AVATAR,
    }
  })
}

async function applyCoreProfileFallback({
  navigate,
  setUsername,
  setFriendsCount,
  setRestaurantCount,
  setRestaurants,
  setCity,
}) {
  const fallbackResponse = await fetchWithLocalFallback(getProfileUrl(), {
    credentials: 'include',
  })

  if (fallbackResponse.status === 401) {
    localStorage.removeItem('isLoggedIn')
    navigate('/login', { replace: true })
    return false
  }

  if (!fallbackResponse.ok) {
    return false
  }

  const fallbackData = await fallbackResponse.json()
  if (!fallbackData?.success || !fallbackData?.user) {
    return false
  }

  const resolvedUsername =
    typeof fallbackData.user.username === 'string' ? fallbackData.user.username : ''
  setUsername(resolvedUsername)
  if (resolvedUsername) {
    localStorage.setItem('profileUsername', resolvedUsername)
  }
  setFriendsCount(Number(fallbackData.user.friends_count) || 0)
  setRestaurantCount(Number(fallbackData.user.restaurant_count) || 0)
  setRestaurants(Array.isArray(fallbackData.restaurants) ? fallbackData.restaurants : [])
  setCity(fallbackData.profile?.city || '')
  return true
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { friendId } = useParams()
  const isFriendView = Boolean(friendId)
  const fileInputRef = useRef(null)
  const [username, setUsername] = useState(() =>
    isFriendView ? '' : localStorage.getItem('profileUsername') || ''
  )
  const [friendsCount, setFriendsCount] = useState(0)
  const [restaurantCount, setRestaurantCount] = useState(0)
  const [restaurants, setRestaurants] = useState([])
  const [city, setCity] = useState('')
  const [profilePic, setProfilePic] = useState(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [feedback, setFeedback] = useState({ message: '', type: null })

  function showFeedback(message, type = 'success') {
    setFeedback({ message, type })
    const timeoutId = setTimeout(() => {
      setFeedback({ message: '', type: null })
    }, 3000)
    return () => clearTimeout(timeoutId)
  }

  const loadProfileData = useCallback(async () => {
    try {
      if (isFriendView) {
        const friendResponse = await fetchWithLocalFallback(getFriendsUrl(), {
          credentials: 'include',
        })

        if (friendResponse.status === 401) {
          localStorage.removeItem('isLoggedIn')
          navigate('/login', { replace: true })
          return
        }

        if (!friendResponse.ok) {
          setUsername('Unknown User')
          setFriendsCount(0)
          setRestaurantCount(0)
          setRestaurants([])
          setCity('')
          setProfilePic(null)
          return
        }

        const friendData = await friendResponse.json()
        const friends = Array.isArray(friendData.friends) ? friendData.friends : []
        const target = friends.find((f) => String(f.user_id) === String(friendId))

        if (!target) {
          setUsername('Unknown User')
          setFriendsCount(0)
          setRestaurantCount(0)
          setRestaurants([])
          setCity('')
          setProfilePic(null)
          return
        }

        setUsername(target.username || 'Unknown User')
        setFriendsCount(0)
        setRestaurantCount(0)
        setRestaurants([])
        setCity('')
        setProfilePic(null)
        return
      }

      const response = await fetchWithLocalFallback(getUserProfileFullUrl(), {
        credentials: 'include',
      })

      if (response.status === 401) {
        localStorage.removeItem('isLoggedIn')
        navigate('/login', { replace: true })
        return
      }

      if (!response.ok) {
        const restored = await applyCoreProfileFallback({
          navigate,
          setUsername,
          setFriendsCount,
          setRestaurantCount,
          setRestaurants,
          setCity,
        })
        if (!restored) {
          setUsername('')
          setFriendsCount(0)
          setRestaurantCount(0)
          setRestaurants([])
          setCity('')
        }
        setProfilePic(null)
        return
      }

      const data = await response.json()
      if (data.success) {
        const resolvedUsername = typeof data.username === 'string' ? data.username : ''
        setUsername(resolvedUsername)
        if (resolvedUsername) {
          localStorage.setItem('profileUsername', resolvedUsername)
        }
        setFriendsCount(Number(data.friend_count) || 0)
        setRestaurantCount(Number(data.restaurant_count) || 0)
        setRestaurants(mapHistoryToRestaurants(data.history))
        setProfilePic(typeof data.img_addr === 'string' && data.img_addr.trim() !== '' ? data.img_addr : null)
      } else {
        const restored = await applyCoreProfileFallback({
          navigate,
          setUsername,
          setFriendsCount,
          setRestaurantCount,
          setRestaurants,
          setCity,
        })
        if (!restored) {
          setUsername('')
          setFriendsCount(0)
          setRestaurantCount(0)
          setRestaurants([])
        }
        setProfilePic(null)
      }
      if (data.success) {
        setCity('')
      }
    } catch (error) {
      console.error('Error fetching profile data:', error)
      setRestaurants([])
      setProfilePic(null)
    }
  }, [friendId, isFriendView, navigate])

  useEffect(() => {
    loadProfileData()
  }, [loadProfileData])

  function handleAvatarClick() {
    if (isFriendView) {
      return
    }

    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || isFriendView || isUploadingAvatar) {
      return
    }

    const formData = new FormData()
    formData.append('avatar', file)

    setIsUploadingAvatar(true)
    try {
      const response = await fetchWithLocalFallback(getUploadAvatarUrl(), {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (response.status === 401) {
        localStorage.removeItem('isLoggedIn')
        navigate('/login', { replace: true })
        return
      }

      let data = null
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok || !data?.success) {
        const message = data?.message === ALLOWED_TYPE_MESSAGE
          ? ALLOWED_TYPE_MESSAGE
          : GENERIC_AVATAR_FAILURE
        showFeedback(message, 'error')
        return
      }

      showFeedback('Profile picture updated successfully!', 'success')
      await loadProfileData()
    } catch (error) {
      console.error('Error uploading avatar:', error)
      showFeedback(GENERIC_AVATAR_FAILURE, 'error')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  async function handleLogout() {
    try {
      await fetchWithLocalFallback(getLogoutUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
    } catch {
      // continue
    } finally {
      localStorage.removeItem('isLoggedIn')
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="profile-page">
      <NavBar onLogout={handleLogout} />
      <main className="profile-main">
        <section className="profile-summary">
          <div
            className={`profile-avatar-shell${isFriendView ? '' : ' is-clickable'}`}
            aria-hidden={isFriendView}
            onClick={handleAvatarClick}
            role={isFriendView ? undefined : 'button'}
            tabIndex={isFriendView ? undefined : 0}
            onKeyDown={(event) => {
              if (!isFriendView && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault()
                handleAvatarClick()
              }
            }}
          >
            <img
              src={resolveAssetUrl(profilePic)}
              alt=""
              className="profile-avatar"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
          <div className="profile-summary-text">
            <span className="profile-username">@{username}</span>
            {!isFriendView && feedback.message && (
              <div
                className="profile-feedback-banner"
                style={{
                  padding: '12px 16px',
                  marginBottom: '12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: feedback.type === 'success' ? '#d4edda' : '#f8d7da',
                  color: feedback.type === 'success' ? '#155724' : '#721c24',
                  border: `1px solid ${feedback.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
                }}
              >
                {feedback.message}
              </div>
            )}
            {!isFriendView && (
              <Link to="/profile/settings" className="profile-edit-btn">
                Edit Profile
              </Link>
            )}
            {!isFriendView && (
              <p className="profile-stats">
                {friendsCount} Friends · {restaurantCount} Restaurants
              </p>
            )}
            {city && (
              <p className="profile-location-display">📍 {city}</p>
            )}
          </div>
        </section>

        <hr className="profile-divider" />

        <section className="profile-recent">
          <div className="profile-recent-header">
            <h2 className="profile-recent-title">
              {isFriendView ? 'Friend Profile' : 'Recent Restaurants You Visited:'}
            </h2>
            <div className="profile-recent-icons" aria-hidden>
              <span className="profile-recent-icon" title="Filter" />
              <span className="profile-recent-icon" title="View" />
              <span className="profile-recent-icon" title="Group" />
            </div>
          </div>
          <ul className="profile-restaurant-list">
            {restaurants.map((r) => (
              <li key={r.id || r.name} className="profile-restaurant-card">
                <div className="profile-restaurant-image-wrap">
                  <img src={r.image} alt="" className="profile-restaurant-image" />
                  <span className="profile-restaurant-price">{r.price}</span>
                  <span className="profile-restaurant-badge" title="Dietary options">&#9673;</span>
                </div>
                <div className="profile-restaurant-info">
                  <strong className="profile-restaurant-name">{r.name}</strong>
                  {r.cuisine && <span className="profile-restaurant-cuisine">{r.cuisine}</span>}
                  <span className="profile-restaurant-rating">{r.rating} ★</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
