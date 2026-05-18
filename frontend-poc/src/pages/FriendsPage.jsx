import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import SharedRestaurantsList from "../components/SharedRestaurantsList";
import SharedTagsList from "../components/SharedTagsList";
import deleteTrashIcon from "../assets/DeleteTrash.svg";
import { buildApiUrl } from "../lib/apiBase";

const PLACEHOLDER_AVATAR =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>',
  );

function resolveAssetUrl(path) {
  if (!path) {
    return PLACEHOLDER_AVATAR;
  }
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return buildApiUrl(normalizedPath);
}

const CUISINE_OPTIONS = [
  "American",
  "Barbecue",
  "British",
  "Chinese",
  "French",
  "Greek",
  "Indian",
  "Italian",
  "Japanese",
  "Korean",
  "Latin American",
  "Mediterranean",
  "Mexican",
  "Thai",
  "Vietnamese",
];

function renderStars(rating) {
  const num = Number(rating) || 0;
  const full = Math.floor(num);
  return Array.from({ length: 5 }, (_, i) => (
    <span
      key={i}
      className={
        i < full ? "friends-star friends-star--filled" : "friends-star"
      }
    >
      ★
    </span>
  ));
}

function loadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function CompatibilityCircle({ score }) {
  return (
    <div className="friends-compat-wrap">
      <div className="friends-compat-circle">
        <span className="friends-compat-score">{score}%</span>
      </div>
      <p className="friends-compat-title">Taste Compatibility</p>
      <p className="friends-compat-subtitle">
        Based on cuisine and dietary preferences
      </p>
    </div>
  );
}

function RemoveFriendModal({
  isOpen,
  friendName,
  onCancel,
  onConfirm,
  isSubmitting,
}) {
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="remove-friend-modal__backdrop"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="remove-friend-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-friend-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3
          id="remove-friend-modal-title"
          className="remove-friend-modal__title"
        >
          Are you sure?
        </h3>
        <p className="remove-friend-modal__subtitle">
          Remove {friendName} from your friends? You can always add them back
          later.
        </p>
        <div className="remove-friend-modal__actions">
          <button
            type="button"
            className="remove-friend-modal__btn remove-friend-modal__btn--cancel"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="remove-friend-modal__btn remove-friend-modal__btn--confirm"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Removing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FriendsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendProfile, setFriendProfile] = useState(null);
  const [sharedRestaurants, setSharedRestaurants] = useState([]);
  const [sharedTags, setSharedTags] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [removeStatusMessage, setRemoveStatusMessage] = useState("");
  const [isRemovingFriend, setIsRemovingFriend] = useState(false);
  const removeStatusTimerRef = useRef(null);
  const [myDietaryRestrictions] = useState(() =>
    loadJson("profileDietaryRestrictions"),
  );
  const [myDislikedCuisines] = useState(() =>
    loadJson("profileDislikedCuisines"),
  );

  useEffect(() => {
    if (!removeStatusMessage) {
      return;
    }

    if (removeStatusTimerRef.current) {
      clearTimeout(removeStatusTimerRef.current);
    }

    removeStatusTimerRef.current = setTimeout(() => {
      setRemoveStatusMessage("");
      removeStatusTimerRef.current = null;
    }, 4000);

    return () => {
      if (removeStatusTimerRef.current) {
        clearTimeout(removeStatusTimerRef.current);
        removeStatusTimerRef.current = null;
      }
    };
  }, [removeStatusMessage]);

  function getUrl() {
    const path = window.location.pathname.replace(/\/?$/, "/");
    return path;
  }

  useEffect(() => {
    fetch(
      getUrl() + "src/list_friends.php?search=" + encodeURIComponent(search),
      { method: "GET", credentials: "include" },
    )
      .then((res) => res.json())
      .then((data) => setFriends(data.friends || []))
      .catch(() => {});
  }, [search]);

  useEffect(() => {
    if (!selectedFriend) {
      setFriendProfile(null);
      setSharedRestaurants([]);
      setSharedTags([]);
      return;
    }

    setProfileLoading(true);
    setFriendProfile(null);
    setSharedRestaurants([]);
    setSharedTags([]);
    fetch(getUrl() + "src/get_friend_profile_full.php", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friend_id: selectedFriend.user_id }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.success) {
          setFriendProfile(null);
          setSharedRestaurants([]);
          setSharedTags([]);
          return;
        }
        setFriendProfile(data);
        setSharedRestaurants(
          Array.isArray(data.shared_restaurants) ? data.shared_restaurants : [],
        );
        setSharedTags(Array.isArray(data.shared_tags) ? data.shared_tags : []);
      })
      .catch(() => {
        setFriendProfile(null);
        setSharedRestaurants([]);
        setSharedTags([]);
      })
      .finally(() => setProfileLoading(false));
  }, [selectedFriend]);

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

  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(search.toLowerCase()),
  );

  function getInitials(username) {
    const parts = username.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return username.slice(0, 2).toUpperCase();
  }

  const myDislikedSet = useMemo(
    () => new Set(myDislikedCuisines),
    [myDislikedCuisines],
  );

  const friendLikedCuisines = useMemo(() => {
    if (!friendProfile) return [];
    const friendDisliked = new Set(friendProfile.disliked_cuisines || []);
    return CUISINE_OPTIONS.filter((c) => !friendDisliked.has(c));
  }, [friendProfile]);

  function openRemoveModal(friend) {
    setFriendToRemove(friend);
    setRemoveModalOpen(true);
    setRemoveStatusMessage("");
  }

  function closeRemoveModal() {
    setRemoveModalOpen(false);
    setFriendToRemove(null);
  }

  async function confirmRemoveFriend() {
    if (!friendToRemove) {
      return;
    }

    setIsRemovingFriend(true);

    try {
      const response = await fetch(getUrl() + "src/remove_friend.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friend_id: friendToRemove.user_id }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        setRemoveStatusMessage("Something went wrong. Try again");
      } else {
        setRemoveStatusMessage(
          `${friendToRemove.username} was removed from your friends list.`,
        );
        setFriends((prev) =>
          prev.filter((friend) => friend.user_id !== friendToRemove.user_id),
        );
        if (selectedFriend?.user_id === friendToRemove.user_id) {
          setSelectedFriend(null);
          setFriendProfile(null);
          setSharedRestaurants([]);
          setSharedTags([]);
        }
      }
    } catch (error) {
      setRemoveStatusMessage("Something went wrong. Try again");
    } finally {
      setIsRemovingFriend(false);
      closeRemoveModal();
    }
  }

  return (
    <div className="friends-page">
      <NavBar onLogout={handleLogout} />
      <div className="friends-body">
        {/* Left Sidebar */}
        <aside className="friends-sidebar">
          <div className="friends-search-row">
            <svg
              className="friends-search-icon"
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
              className="friends-search-input"
              placeholder="Search for your friends"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className="friends-action-btn friends-action-btn--primary"
            onClick={() => navigate("/friends/add")}
          >
            Add Friend
          </button>
          <button
            className="friends-action-btn friends-action-btn--secondary"
            onClick={() => navigate("/friends/requests")}
          >
            View Friend Requests
          </button>

          <div className="friends-list">
            {filteredFriends.map((friend) => (
              <button
                key={friend.user_id ?? friend.username}
                className={`friends-list-item${selectedFriend?.username === friend.username ? " friends-list-item--active" : ""}`}
                onClick={() => setSelectedFriend(friend)}
                type="button"
              >
                <div className="friends-avatar">
                  {friend.img_addr ? (
                    <img
                      src={resolveAssetUrl(friend.img_addr)}
                      alt={friend.username}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "inherit",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    getInitials(friend.username)
                  )}
                </div>
                <div className="friends-list-info">
                  <span className="friends-list-name">{friend.username}</span>
                  <span
                    className={`friends-list-status${friend.status === "active" ? " friends-list-status--active" : ""}`}
                  >
                    {friend.status === "active" ? (
                      <>
                        <span className="friends-status-dot friends-status-dot--active" />
                        Active in party
                      </>
                    ) : (
                      "Offline"
                    )}
                  </span>
                </div>
                <span
                  className="friends-remove-button"
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${friend.username}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    openRemoveModal(friend);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      openRemoveModal(friend);
                    }
                  }}
                >
                  <img src={deleteTrashIcon} alt="Remove" />
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Right Panel */}
        <main className="friends-panel">
          {removeStatusMessage && (
            <div className="friends-status-message" role="status">
              {removeStatusMessage}
            </div>
          )}
          {selectedFriend ? (
            <div className="friends-detail">
              <div className="friends-detail-avatar">
                {selectedFriend.img_addr ? (
                  <img
                    src={resolveAssetUrl(selectedFriend.img_addr)}
                    alt={selectedFriend.username}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "inherit",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  getInitials(selectedFriend.username)
                )}
              </div>
              <h2 className="friends-detail-name">{selectedFriend.username}</h2>

              {profileLoading && (
                <p className="friends-profile-loading">Loading profile...</p>
              )}

              {friendProfile && !profileLoading && (
                <div className="friends-profile-body">
                  {/* Compatibility Score */}
                  {friendProfile.compatibility != null && (
                    <CompatibilityCircle score={friendProfile.compatibility} />
                  )}

                  {/* Dietary Restrictions + Cuisines side by side */}
                  <div className="friends-profile-row">
                    <div className="friends-profile-col friends-profile-card">
                      <h3 className="friends-profile-section-title">
                        Dietary Restrictions
                      </h3>
                      {friendProfile.dietary_restrictions.length === 0 ? (
                        <p className="friends-profile-empty">None listed</p>
                      ) : (
                        <div className="friends-diet-list">
                          {friendProfile.dietary_restrictions.map((r) => {
                            const shared = myDietaryRestrictions.includes(r);
                            return (
                              <div key={r} className="friends-diet-row">
                                <span className="friends-diet-name">{r}</span>
                                {shared ? (
                                  <span className="friends-diet-badge">
                                    ✓ Shared
                                  </span>
                                ) : (
                                  <span className="friends-diet-only">
                                    <span className="friends-diet-only-dot" />
                                    {selectedFriend.username} only
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="friends-profile-col friends-profile-card">
                      <h3 className="friends-profile-section-title">
                        Shared Cuisines
                      </h3>
                      {friendLikedCuisines.filter((c) => !myDislikedSet.has(c))
                        .length === 0 ? (
                        <p className="friends-profile-empty">
                          No shared cuisines
                        </p>
                      ) : (
                        <div className="friends-cuisine-grid">
                          {friendLikedCuisines
                            .filter((c) => !myDislikedSet.has(c))
                            .map((c) => (
                              <span
                                key={c}
                                className="friends-cuisine-pill friends-cuisine-pill--shared"
                              >
                                {c}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Restaurant History */}
                  <div className="friends-profile-section">
                    <h3 className="friends-profile-section-title">
                      Restaurant History:
                    </h3>
                    {friendProfile.visited_restaurants.length === 0 ? (
                      <p className="friends-profile-empty">
                        No visited restaurants yet.
                      </p>
                    ) : (
                      friendProfile.visited_restaurants.map((r) => {
                        const mapsUrl =
                          r.lat && r.lng
                            ? `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name)}`;
                        return (
                          <div key={r.id} className="friends-history-card">
                            <div className="friends-history-card__info">
                              <p className="friends-history-card__name">
                                {r.name}
                              </p>
                              <div className="friends-history-card__meta">
                                <span className="friends-history-stars">
                                  {renderStars(r.rating)}
                                </span>
                                <span className="friends-history-rating">
                                  {r.rating}
                                </span>
                                <span className="friends-history-dot">·</span>
                                <span>{r.cost}</span>
                                <span className="friends-history-dot">·</span>
                                <span>{r.distance} mi</span>
                              </div>
                              <div className="friends-history-tags">
                                {(r.tags || []).map((tag) => (
                                  <span
                                    key={tag}
                                    className="friends-history-tag"
                                  >
                                    {String(tag).replace(/_/g, " ")}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="friends-history-navigate"
                            >
                              Navigate
                            </a>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <SharedRestaurantsList
                    restaurants={sharedRestaurants}
                    friendName={selectedFriend.username}
                  />

                  <SharedTagsList tags={sharedTags} />
                </div>
              )}
            </div>
          ) : (
            <div className="friends-panel-empty">
              <p>Select a friend to view their profile.</p>
            </div>
          )}
        </main>
        <RemoveFriendModal
          isOpen={removeModalOpen}
          friendName={friendToRemove?.username || "this friend"}
          onCancel={closeRemoveModal}
          onConfirm={confirmRemoveFriend}
          isSubmitting={isRemovingFriend}
        />
      </div>
    </div>
  );
}
