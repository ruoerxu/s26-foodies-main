import { useEffect, useState } from 'react'
import { buildApiUrl } from '../../lib/apiBase'
import mobileBackArrowIcon from '../../assets/right-arrow 1.svg'

function getInitials(name) {
  const cleaned = String(name ?? '').trim()
  if (!cleaned) {
    return 'NA'
  }

  const words = cleaned.split(/[\s._-]+/).filter(Boolean)
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
  }

  return cleaned.slice(0, 2).toUpperCase()
}

function getProfileUrl() {
  return buildApiUrl('/src/profile.php')
}

export default function Step3Review({
  partyName,
  selectedFriends,
  onBack,
  onCreate,
  isCreating = false,
  createError = '',
}) {
  const [organizerName, setOrganizerName] = useState(() => {
    const profileUsername = localStorage.getItem('profileUsername')
    return profileUsername && profileUsername.trim() ? profileUsername.trim() : 'You'
  })
  const safePartyName = partyName?.trim() || 'Untitled Party'
  const friends = (Array.isArray(selectedFriends) ? selectedFriends : [])
    .map((friend) =>
      typeof friend === 'string'
        ? { username: friend, avatarUrl: '' }
        : { username: friend?.username || '', avatarUrl: friend?.avatarUrl || '' }
    )
    .filter((friend) => friend.username)

  useEffect(() => {
    let cancelled = false

    fetch(getProfileUrl(), { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) {
          return
        }

        const username = data?.user?.username
        if (typeof username === 'string' && username.trim()) {
          setOrganizerName(username.trim())
          localStorage.setItem('profileUsername', username.trim())
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="review-step">
      <button type="button" className="review-step__mobile-back" onClick={onBack} aria-label="Go back">
        <img src={mobileBackArrowIcon} alt="" aria-hidden="true" />
      </button>

      <h2 className="review-step__title">Review Party</h2>

      <section className="review-step__card" aria-label="Review party details">
        <p className="review-step__label">Party Name</p>
        <p className="review-step__value">{safePartyName}</p>

        <p className="review-step__label review-step__label--spaced">Members ({friends.length})</p>
        <div className="review-step__members" aria-label="Selected members">
          {friends.length > 0 ? (
            friends.map((friend) => (
              <span key={friend.username} className="review-step__member-chip" title={friend.username}>
                {friend.avatarUrl ? (
                  <img
                    className="review-step__member-photo"
                    src={friend.avatarUrl}
                    alt={friend.username}
                    onError={(event) => {
                      event.currentTarget.style.display = 'none'
                    }}
                  />
                ) : null}
                <span className="review-step__member-initials">
                  {getInitials(friend.username)}
                </span>
              </span>
            ))
          ) : (
            <p className="review-step__empty">No invited members yet.</p>
          )}
        </div>
        <p className="review-step__label review-step__label--spaced">Organizer</p>
        <p className="review-step__organizer">{organizerName}</p>
      </section>

      <div className="review-step__actions">
        <button type="button" className="review-step__back-btn" onClick={onBack}>
          Back
        </button>
        <button type="button" className="review-step__create-btn" onClick={onCreate} disabled={isCreating}>
          {isCreating ? 'Creating...' : 'Create Party'}
        </button>
      </div>
      {createError ? (
        <p className="review-step__error" role="alert">
          {createError}
        </p>
      ) : null}
    </div>
  )
}
