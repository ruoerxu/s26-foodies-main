import { useNavigate } from 'react-router-dom'

export default function EmailConfirmationPage() {
  const navigate = useNavigate()

  return (
    <div className="login-page">
      <div className="confirm-card">
        <div className="confirm-icon-wrapper">
          <svg className="confirm-icon" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m2 7 10 7 10-7" />
          </svg>
        </div>

        <h2 className="confirm-title">Check your email</h2>
        <p className="confirm-subtitle">
          We've sent a confirmation link to your email address. Please click the link to verify your account.
        </p>

        <button className="confirm-back-btn" onClick={() => navigate('/login')}>
          Back to Login
        </button>
      </div>
    </div>
  )
}
