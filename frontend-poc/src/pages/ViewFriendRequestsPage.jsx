import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import NavBar from '../components/NavBar'

function getBasePath() {
  return window.location.pathname.replace(/\/?$/, '/')
}

function getListFriendRequestsUrl() {
  return getBasePath() + 'src/list_friend_requests.php'
}

export default function ViewFriendRequestsPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(getListFriendRequestsUrl(), { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not load friend requests.')
        setRequests([])
        return
      }
      if (Array.isArray(data.requests)) {
        setRequests(data.requests)
      } else {
        setRequests([])
      }
    } catch {
      setError('Could not load friend requests.')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  async function handleLogout() {
    try {
      await fetch(getBasePath() + 'src/logout.php', {
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

  function handleAccept(request) {
    // TODO: POST to accept_friend_request.php with { request_id: request.request_id } or { user_id: request.user_id }
  }

  return (
    <div className="view-friend-requests-page">
      <NavBar onLogout={handleLogout} />
      <main className="view-friend-requests-main">
        <Link to="/friends" className="view-friend-requests-back">← Back</Link>
        <div className="view-friend-requests-card">
          <h1 className="view-friend-requests-title">Friend Requests:</h1>
          {error && <p className="view-friend-requests-error">{error}</p>}
          {loading && <p className="view-friend-requests-loading">Loading…</p>}
          <ul className="view-friend-requests-list">
            {requests.map((u) => (
              <li key={u.request_id ?? u.user_id} className="view-friend-requests-item">
                <span className="view-friend-requests-username">{u.username}</span>
                <button
                  type="button"
                  className="view-friend-requests-accept-btn"
                  onClick={() => handleAccept(u)}
                >
                  Accept
                </button>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  )
}
