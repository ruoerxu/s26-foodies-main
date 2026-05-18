import { useEffect, useState } from "react";
import moreFriendsIcon from "../../assets/MoreFriendsIcon.svg";
import mobileBackArrowIcon from "../../assets/right-arrow 1.svg";
import { buildApiUrl } from "../../lib/apiBase";

function getInitials(name) {
  const cleaned = String(name ?? "").trim();
  if (!cleaned) {
    return "NA";
  }

  const words = cleaned.split(/[\s._-]+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return cleaned.slice(0, 2).toUpperCase();
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 7H18C20.7614 7 23 9.23858 23 12C23 14.7614 20.7614 17 18 17H15"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 17H6C3.23858 17 1 14.7614 1 12C1 9.23858 3.23858 7 6 7H9"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12H15.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Step2InviteFriends({
  selectedFriends,
  onSelectedFriendsChange,
  onBack,
  onNext,
}) {
  const [friends, setFriends] = useState([]);
  const [visibleCount, setVisibleCount] = useState(4);
  const shareUrl = window.location.href;

  function extractAvatarUrl(friend) {
    if (!friend || typeof friend !== "object") {
      return "";
    }

    return (
      friend.profile_picture_url ||
      friend.profilePictureUrl ||
      friend.profile_picture ||
      friend.profilePicture ||
      friend.avatar_url ||
      friend.avatarUrl ||
      friend.avatar ||
      friend.img_addr ||
      friend.imgAddr ||
      friend.image_url ||
      friend.imageUrl ||
      friend.image ||
      ""
    );
  }

  useEffect(() => {
    let cancelled = false;

    function normalizeFriends(payload) {
      const incoming = Array.isArray(payload?.friends) ? payload.friends : [];
      return incoming
        .map((friend) => {
          if (typeof friend === "string") {
            return { username: friend, avatarUrl: "" };
          }

          if (typeof friend?.username === "string") {
            return {
              user_id: Number(friend.user_id ?? friend.id ?? 0),
              username: friend.username,
              avatarUrl: extractAvatarUrl(friend),
            };
          }

          return null;
        })
        .filter(Boolean);
    }

    fetch(buildApiUrl("/src/list_friends.php?search="), {
      method: "GET",
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => normalizeFriends(data))
      .catch(() => [])
      .then((listFriends) => {
        if (cancelled) {
          return;
        }

        const mergedByUsername = new Map();
        for (const friend of listFriends) {
          const key = friend.username.toLowerCase();
          const existing = mergedByUsername.get(key);
          if (!existing || (!existing.avatarUrl && friend.avatarUrl)) {
            mergedByUsername.set(key, friend);
          }
        }

        setFriends(Array.from(mergedByUsername.values()));
        setVisibleCount(4);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (friends.length === 0) {
      return;
    }

    onSelectedFriendsChange((current) =>
      current.filter((selected) =>
        friends.some((friend) =>
          typeof selected === "string"
            ? friend.username === selected
            : friend.username === selected.username,
        ),
      ),
    );
  }, [friends, onSelectedFriendsChange]);

  function isFriendSelected(friendName) {
    return selectedFriends.some((friend) =>
      typeof friend === "string"
        ? friend === friendName
        : friend.username === friendName,
    );
  }

  function toggleFriend(friend) {
    onSelectedFriendsChange((current) => {
      if (
        current.some((selected) =>
          typeof selected === "string"
            ? selected === friend.username
            : selected.username === friend.username,
        )
      ) {
        return current.filter((selected) =>
          typeof selected === "string"
            ? selected !== friend.username
            : selected.username !== friend.username,
        );
      }

      return [...current, friend];
    });
  }

  const visibleFriends = friends.slice(0, visibleCount);
  const hasFriends = friends.length > 0;
  const hasMoreFriends = friends.length > visibleCount;

  function handleShowMoreFriends() {
    setVisibleCount((count) => Math.min(count + 3, friends.length));
  }

  return (
    <div className="invite-step">
      <button
        type="button"
        className="invite-step__mobile-back"
        onClick={onBack}
        aria-label="Go back"
      >
        <img src={mobileBackArrowIcon} alt="" aria-hidden="true" />
      </button>

      <h2 className="invite-step__title">Invite friends</h2>

      <div className="invite-step__link-wrap" aria-label="Invite link">
        <input
          className="invite-step__link-input"
          type="text"
          value={shareUrl}
          readOnly
        />
        <span className="invite-step__link-icon" aria-hidden="true">
          <LinkIcon />
        </span>
      </div>

      <button type="button" className="invite-step__share-btn">
        Share Link
      </button>

      <section
        className="invite-step__friends-card"
        aria-label="Friend suggestions"
      >
        {hasFriends ? (
          <>
            {visibleFriends.map((friend) => (
              <button
                key={friend.username}
                type="button"
                className={`invite-step__friend-row${isFriendSelected(friend.username) ? " invite-step__friend-row--selected" : ""}`}
                onClick={() => toggleFriend(friend)}
                aria-pressed={isFriendSelected(friend.username)}
              >
                <span className="invite-step__avatar" aria-hidden="true">
                  {friend.avatarUrl ? (
                    <img
                      className="invite-step__avatar-photo"
                      src={friend.avatarUrl}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                  <span className="invite-step__avatar-initials">
                    {getInitials(friend.username)}
                  </span>
                </span>
                <span className="invite-step__friend-name">
                  {friend.username}
                </span>
              </button>
            ))}

            {hasMoreFriends && (
              <button
                type="button"
                className="invite-step__friend-row"
                onClick={handleShowMoreFriends}
              >
                <span className="invite-step__avatar" aria-hidden="true">
                  <img src={moreFriendsIcon} alt="" />
                </span>
                <span className="invite-step__friend-name">
                  See more friends
                </span>
              </button>
            )}
          </>
        ) : (
          <p className="invite-step__empty-msg">No friends yet.</p>
        )}
      </section>

      <div className="invite-step__actions">
        <button
          type="button"
          className="invite-step__back-btn"
          onClick={onBack}
        >
          Back
        </button>
        <button
          type="button"
          className="invite-step__next-btn"
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
