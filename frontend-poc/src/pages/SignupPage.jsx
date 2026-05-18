import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import foodiesLogo from "../assets/foodies logo.png";

function PersonIcon() {
  return (
    <svg
      className="signup-input-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      className="signup-input-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 7 10-7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      className="signup-input-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="11" width="14" height="11" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usernameUnique, setUsernameUnique] = useState(true);

  function getUrl() {
    const path = window.location.pathname.replace(/\/?$/, "/");
    return path;
  }

  // Username validation
  const usernameValidLength = username.length >= 3 && username.length <= 30;
  const usernameValidChars =
    username.length > 0 && /^[a-zA-Z0-9_.\-]+$/.test(username);
  const usernameValidFormat = usernameValidLength && usernameValidChars;

  // Email validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Password validation
  const passwordLength = password.length >= 8;
  const passwordHasNumber = /\d/.test(password);
  const passwordHasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(
    password,
  );

  // Confirm password
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const formValid =
    usernameValidFormat &&
    emailValid &&
    passwordLength &&
    passwordHasNumber &&
    passwordHasSymbol &&
    passwordsMatch &&
    confirmPassword.length > 0;

  function onUsernameChange(e) {
    setUsername(e.target.value);
    fetch(getUrl() + "src/check_username.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: e.target.value }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.unique) {
          setUsernameUnique(true);
        } else {
          setUsernameUnique(false);
        }
      });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formValid) return;
    setLoading(true);
    setError("");
    try {
      fetch(getUrl() + "src/create_account.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            navigate("/email-confirmation");
          } else {
            setError(data.error || "Failed to create account.");
          }
        });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <Link to="/" className="login-logo">
        <img src={foodiesLogo} alt="Foodies logo" width={130} />
        <span className="login-logo-title">FOODIES</span>
      </Link>

      <p className="login-subtitle">
        Create an account to start dining with friends.
      </p>

      <div className="login-card">
        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div className="login-field">
            <label htmlFor="username">Username</label>
            <div className="signup-input-row">
              <PersonIcon />
              <input
                id="username"
                type="text"
                placeholder="Type in a username..."
                value={username}
                onChange={onUsernameChange}
                required
              />
            </div>
            <p
              className={`signup-rule ${usernameUnique ? "signup-rule--pass" : "signup-rule--fail"}`}
            >
              {usernameUnique ? "✓" : "✗"} Unique
            </p>
            <p
              className={`signup-rule ${usernameValidLength ? "signup-rule--pass" : "signup-rule--fail"}`}
            >
              {usernameValidLength ? "✓" : "✗"} Must be between 3 and 30
              characters
            </p>
            <p
              className={`signup-rule ${usernameValidChars ? "signup-rule--pass" : "signup-rule--fail"}`}
            >
              {usernameValidChars ? "✓" : "✗"} Must only contain letters,
              numbers, "_", ".", "-"
            </p>
          </div>

          {/* Email */}
          <div className="login-field">
            <label htmlFor="email">Email</label>
            <div className="signup-input-row">
              <EmailIcon />
              <input
                id="email"
                type="email"
                placeholder="Type in your email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <p
              className={`signup-rule ${emailValid ? "signup-rule--pass" : "signup-rule--fail"}`}
            >
              {emailValid ? "✓" : "✗"} Must be a valid email
            </p>
          </div>

          {/* Password */}
          <div className="login-field">
            <label htmlFor="password">Password</label>
            <div className="signup-input-row">
              <LockIcon />
              <input
                id="password"
                type="password"
                placeholder="Type in a password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <p
              className={`signup-rule ${passwordLength ? "signup-rule--pass" : "signup-rule--fail"}`}
            >
              {passwordLength ? "✓" : "✗"} Must be at least 8 characters
            </p>
            <p
              className={`signup-rule ${passwordHasNumber ? "signup-rule--pass" : "signup-rule--fail"}`}
            >
              {passwordHasNumber ? "✓" : "✗"} Must include a number
            </p>
            <p
              className={`signup-rule ${passwordHasSymbol ? "signup-rule--pass" : "signup-rule--fail"}`}
            >
              {passwordHasSymbol ? "✓" : "✗"} Must include a symbol
            </p>
          </div>

          {/* Confirm Password */}
          <div className="login-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="signup-input-row">
              <LockIcon />
              <input
                id="confirmPassword"
                type="password"
                placeholder="Retype your password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <p
              className={`signup-rule ${passwordsMatch ? "signup-rule--pass" : "signup-rule--fail"}`}
            >
              {passwordsMatch ? "✓" : "✗"} Passwords match
            </p>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button
            type="submit"
            className="login-btn"
            disabled={loading || !formValid}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="login-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
