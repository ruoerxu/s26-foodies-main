import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";

export default function AddFriendPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  function getUrl() {
    const path = window.location.pathname.replace(/\/?$/, "/");
    return path;
  }

  async function handleLogout() {
    try {
      await fetch(getUrl() + "src/logout.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } catch {
      // continue logout locally
    } finally {
      localStorage.removeItem("isLoggedIn");
      navigate("/login", { replace: true });
    }
  }

  function fetchUsers(q) {
    fetch(getUrl() + "src/list_users.php?search=" + encodeURIComponent(q), {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setResults(data.users || []))
      .catch(() => {});
  }

  useEffect(() => {
    fetchUsers("");
  }, []);

  function handleSearch(e) {
    const q = e.target.value;
    setQuery(q);
    fetchUsers(q);
  }

  function sendFriendRequest(user_id) {
    fetch(getUrl() + "src/send_friend_request.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user_id }),
      credentials: "include",
    })
      .then((res) => res.json())
      .catch(() => {});
  }

  return (
    <div className="friends-page">
      <NavBar onLogout={handleLogout} />
      <div className="addfriend-body">
        <button
          className="addfriend-back-btn"
          onClick={() => navigate("/friends")}
          aria-label="Back"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            width="24"
            height="24"
            aria-hidden="true"
          >
            <path
              d="M19 12H5M5 12L12 19M5 12L12 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="addfriend-card">
          <h1 className="addfriend-title">Add Friend:</h1>
          <p className="addfriend-subtitle">
            You can add friends with their Foodies username.
          </p>

          <div className="addfriend-search-row">
            <svg
              className="addfriend-search-icon"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="9" cy="9" r="6" stroke="#aaa" strokeWidth="2" />
              <path
                d="M13.5 13.5L17 17"
                stroke="#aaa"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              className="addfriend-search-input"
              placeholder="Type in a username"
              value={query}
              onChange={handleSearch}
            />
          </div>

          <p className="addfriend-results-label">Results:</p>

          <div className="addfriend-results">
            {results.map((user, i) => (
              <div
                key={user.username}
                className={`addfriend-result-row${i % 2 === 0 ? " addfriend-result-row--alt" : ""}`}
              >
                <span className="addfriend-result-name">{user.username}</span>
                <button
                  className="addfriend-send-btn"
                  onClick={() => sendFriendRequest(user.user_id)}
                >
                  Send Friend Request
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
