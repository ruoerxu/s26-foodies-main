import {
  getPartyMembers,
  listFriends,
  addPartyMember,
  removePartyMember,
} from "../lib/partyApi";

// Returns array of members for a party name
async function getMembers(partyName) {
  return await getPartyMembers(partyName);
}

// Returns array of friends (optionally can add search param)
async function getFriends(search = "") {
  return await listFriends(search);
}

// Adds a member to a party
async function addMember(partyId, targetId) {
  return await addPartyMember(partyId, targetId);
}

// Removes a member from a party
async function removeMember(partyId, targetId) {
  return await removePartyMember(partyId, targetId);
}

import { useEffect, useState } from "react";
import deleteTrashIcon from "../assets/DeleteTrash.svg";

function getStoredUserId() {
  const raw =
    localStorage.getItem("user_id") ||
    localStorage.getItem("userId") ||
    sessionStorage.getItem("user_id") ||
    sessionStorage.getItem("userId");
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function MembersPanel({ displayPartyName, partyId }) {
  const [members, setMembers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  function extractAvatarUrl(member) {
    if (!member || typeof member !== "object") return "";
    return (
      member.profile_picture_url ||
      member.profilePictureUrl ||
      member.profile_picture ||
      member.profilePicture ||
      member.avatar_url ||
      member.avatarUrl ||
      member.avatar ||
      member.img_addr ||
      member.imgAddr ||
      member.image_url ||
      member.imageUrl ||
      member.image ||
      ""
    );
  }

  function getInitials(name) {
    const cleaned = String(name ?? "").trim();
    if (!cleaned) return "NA";
    const words = cleaned.split(/\s|_|\.|-/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return cleaned.slice(0, 2).toUpperCase();
  }

  // Remove member handler
  async function handleRemove(member) {
    setRemovingId(member.user_id);
    try {
      await removeMember(partyId, member.user_id);
      setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
    } catch (err) {
      if (err && err.message) {
        setError(err.message);
      } else {
        setError("Failed to remove member");
      }
    } finally {
      setRemovingId(null);
    }
  }

  async function handleAdd(friend) {
    setAddingId(friend.user_id);
    try {
      await addMember(partyId, friend.user_id);
      setMembers((prev) => [...prev, friend]);
    } catch (err) {
      if (err && err.message) {
        setError(err.message);
      } else {
        setError("Failed to add member");
      }
    } finally {
      setAddingId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const userId = getStoredUserId();
    getMembers(displayPartyName)
      .then((data) => {
        if (cancelled) return;
        let arr = [];
        if (Array.isArray(data)) {
          arr = data;
        } else if (Array.isArray(data?.members)) {
          arr = data.members;
        }
        // Filter out the current user
        if (userId) {
          arr = arr.filter((member) => Number(member.user_id) !== userId);
        }
        setMembers(arr);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load members");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [displayPartyName]);

  useEffect(() => {
    let cancelled = false;
    getFriends()
      .then((data) => {
        if (cancelled) return;
        let arr = Array.isArray(data?.friends) ? data.friends : data;
        const memberIds = new Set(members.map((m) => Number(m.user_id)));
        arr = arr.filter((f) => !memberIds.has(Number(f.user_id)));
        setFriends(arr);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load friends");
      });
    return () => {
      cancelled = true;
    };
  }, [members]);

  return (
    <div>
      {!adding && (
        <section
          className="party-settings-delete-card"
          aria-label="Delete party confirmation"
        >
          <h2 className="party-settings-delete-card__title">
            Members of &quot;{displayPartyName}&quot;
          </h2>
          <p className="party-settings-delete-card__text">
            Here you can manage the members of &quot;{displayPartyName}&quot;.
          </p>
          {loading ? (
            <p>Loading members...</p>
          ) : error ? (
            <p className="party-settings-confirm-error">{error}</p>
          ) : (
            <ul className="party-members-list">
              {members.length === 0 ? (
                <li className="party-members-list__item">No members listed.</li>
              ) : (
                members.map((member) => {
                  const avatarUrl = extractAvatarUrl(member);
                  const name = member.username || member.name;
                  return (
                    <li
                      key={member.user_id || member.id || member.username}
                      className="party-members-list__item"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem 0.25rem",
                        borderBottom: "1px solid #ececec",
                        gap: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.7rem",
                        }}
                      >
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={name}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              objectFit: "cover",
                              background: "#f3f3f3",
                              border: "1.5px solid #e5e5e5",
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: "#e7e5e4",
                              color: "#7c7c7c",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "1.1rem",
                              border: "1.5px solid #e5e5e5",
                            }}
                            aria-hidden="true"
                          >
                            {getInitials(name)}
                          </span>
                        )}
                        <span style={{ fontWeight: 500 }}>{name}</span>
                      </span>
                      <button
                        className="party-members-list__remove"
                        style={{
                          background: "none",
                          border: "none",
                          cursor:
                            removingId === member.user_id
                              ? "not-allowed"
                              : "pointer",
                          padding: 0,
                          marginLeft: "0.5rem",
                          opacity: removingId === member.user_id ? 0.5 : 1,
                        }}
                        title="Remove member"
                        aria-label="Remove member"
                        disabled={removingId === member.user_id}
                        onClick={() => handleRemove(member)}
                      >
                        <img
                          src={deleteTrashIcon}
                          alt="Remove"
                          style={{ width: 22, height: 22 }}
                        />
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          )}
          <button className="login-btn" onClick={() => setAdding(true)}>
            Add Member
          </button>
        </section>
      )}
      {adding && (
        <section
          className="party-settings-delete-card"
          aria-label="Delete party confirmation"
        >
          <h2 className="party-settings-delete-card__title">Add Members</h2>
          <p className="party-settings-delete-card__text">
            Here you can add friends to &quot;{displayPartyName}&quot;.
          </p>
          {loading ? (
            <p>Loading friends...</p>
          ) : error ? (
            <p className="party-settings-confirm-error">{error}</p>
          ) : (
            <ul className="party-members-list">
              {friends.length === 0 ? (
                <li className="party-members-list__item">No friends listed.</li>
              ) : (
                friends.map((friend) => {
                  const avatarUrl = extractAvatarUrl(friend);
                  const name = friend.username || friend.name;
                  return (
                    <li
                      key={friend.user_id || friend.id || friend.username}
                      className="party-members-list__item"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem 0.25rem",
                        borderBottom: "1px solid #ececec",
                        gap: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.7rem",
                        }}
                      >
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={name}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              objectFit: "cover",
                              background: "#f3f3f3",
                              border: "1.5px solid #e5e5e5",
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: "#e7e5e4",
                              color: "#7c7c7c",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "1.1rem",
                              border: "1.5px solid #e5e5e5",
                            }}
                            aria-hidden="true"
                          >
                            {getInitials(name)}
                          </span>
                        )}
                        <span style={{ fontWeight: 500 }}>{name}</span>
                      </span>
                      <button
                        className="addfriend-send-btn"
                        onClick={() => handleAdd(friend)}
                      >
                        Add
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          )}
          <button
            className="login-btn"
            style={{ background: "#8bc34a" }}
            onClick={() => setAdding(false)}
          >
            Back to Members
          </button>
        </section>
      )}
    </div>
  );
}
