import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import foodiesLogo from '../assets/foodies logo.png'

export default function LoginPage() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function getLoginUrl() {
    const path = window.location.pathname.replace(/\/?$/, '/')
    return path + 'src/login.php'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(getLoginUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier, password }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('isLoggedIn', 'true')
        if (Number.isInteger(Number(data.user_id)) && Number(data.user_id) > 0) {
          localStorage.setItem('user_id', String(Number(data.user_id)))
        }
        navigate('/dashboard')
      } else {
        setError(data.message || 'Invalid username or password')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(`Could not connect to the server: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <Link to="/" className="login-logo">
        <img src={foodiesLogo} alt="Foodies logo" width={130} />
        <span className="login-logo-title">FOODIES</span>
      </Link>

      <p className="login-subtitle">Welcome back! Let's decide where to eat.</p>

      <div className="login-card">
        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="identifier">Email or Username</label>
            <input
              id="identifier"
              type="text"
              placeholder="Type in your email or username..."
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Type in your password..."
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="login-footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  )
}