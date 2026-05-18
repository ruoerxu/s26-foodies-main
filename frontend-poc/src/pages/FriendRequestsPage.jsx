import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";

export default function FriendRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);

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

  useEffect(() => {
    fetch(getUrl() + "src/list_friend_requests.php", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setRequests(data.requests || []))
      .catch(() => {});
  }, []);

  function acceptRequest(user_id) {
    fetch(getUrl() + "src/accept_friend_request.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user_id }),
      credentials: "include",
    })
      .then((res) => res.json())
      .then(() =>
        setRequests((prev) => prev.filter((r) => r.user_id !== user_id)),
      )
      .catch(() => {});
  }

  function ignoreRequest(user_id) {
    fetch(getUrl() + "src/ignore_friend_request.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user_id }),
      credentials: "include",
    })
      .then((res) => res.json())
      .then(() =>
        setRequests((prev) => prev.filter((r) => r.user_id !== user_id)),
      )
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
          <h1 className="addfriend-title">Friend Requests:</h1>

          <div className="addfriend-results">
            {requests.map((req, i) => (
              <div
                key={req.username}
                className={`addfriend-result-row${i % 2 === 0 ? " addfriend-result-row--alt" : ""}`}
              >
                <span className="addfriend-result-name">{req.username}</span>
                <div className="friendreq-actions">
                  <button
                    className="addfriend-send-btn"
                    onClick={() => acceptRequest(req.user_id)}
                  >
                    Accept
                  </button>
                  <button
                    className="addfriend-send-btn addfriend-send-btn--ignore"
                    onClick={() => ignoreRequest(req.user_id)}
                  >
                    Ignore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
