import { useState } from 'react'

// Resolve URL so it works with HashRouter and with/without trailing slash
function getUsersJsonUrl() {
  const path = window.location.pathname.replace(/\/?$/, '/')
  return path + 'users_json.php'
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function loadUsers() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(getUsersJsonUrl())
      const contentType = res.headers.get('Content-Type') || ''
      const text = await res.text()
      if (!contentType.includes('application/json')) {
        throw new Error(
          `Server returned ${res.status} (not JSON). ` +
          'Upload users_json.php and connect.php to the same folder as index.html.'
        )
      }
      const data = JSON.parse(text)
      if (!res.ok) {
        throw new Error(data.error || data.message || `HTTP ${res.status}`)
      }
      if (data.users) {
        setUsers(data.users)
      } else {
        setUsers([])
      }
    } catch (err) {
      setError(err.message || 'Failed to load users')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="poc-app">
      <h1>POC Users</h1>
      <button type="button" onClick={loadUsers} disabled={loading} className="load-btn">
        {loading ? 'Loading…' : 'Load Users'}
      </button>

      {error && (
        <div className="error-msg" role="alert">
          <div>Error: {error}</div>
          <div className="error-url">
            Requested: {window.location.origin}{getUsersJsonUrl()}
          </div>
        </div>
      )}

      {!error && users.length > 0 && (
        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.username + String(i)}>
                  <td>{u.username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!error && !loading && users.length === 0 && (
        <p className="hint">Click “Load Users” to fetch from the backend.</p>
      )}
    </div>
  )
}
