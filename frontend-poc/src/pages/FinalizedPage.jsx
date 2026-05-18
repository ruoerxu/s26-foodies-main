import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavBar from '../components/NavBar'

const DIETARY_KEYWORDS = ['vegetarian', 'vegan', 'gluten', 'halal', 'kosher', 'dairy-free']

function isDietary(tag) {
  return DIETARY_KEYWORDS.some((kw) => tag.toLowerCase().includes(kw))
}

function StarRating({ rating }) {
  const num = Number(rating) || 0
  const full = Math.floor(num)
  return (
    <span className="finalized-stars" aria-label={`${num} stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < full ? 'finalized-star finalized-star--full' : 'finalized-star finalized-star--empty'}>
          &#9733;
        </span>
      ))}
    </span>
  )
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function PinIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

const ROWS = [
  { key: 'date',     label: 'Date',     sub: 'Select the date',     title: 'Change Date',     placeholder: 'Enter your new date',     Icon: CalendarIcon },
  { key: 'time',     label: 'Time',     sub: 'Select the time',     title: 'Change Time',     placeholder: 'Enter your new time',     Icon: ClockIcon },
  { key: 'location', label: 'Location', sub: 'Select the location', title: 'Change Location', placeholder: 'Enter your new location', Icon: PinIcon },
]

export default function FinalizedPage() {
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const { restaurant = null, rank = 1 } = routerLocation.state ?? {}

  const [activePanel, setActivePanel] = useState(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [meetingLocation, setMeetingLocation] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [citySuggestions, setCitySuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const autocompleteTimerRef = useRef(null)

  const values = { date, time, location: meetingLocation }

  function openPanel(key) {
    setInputValue(values[key])
    setCitySuggestions([])
    setShowSuggestions(false)
    setActivePanel(key)
  }

  function handleSave() {
    if (activePanel === 'date') setDate(inputValue)
    else if (activePanel === 'time') setTime(inputValue)
    else if (activePanel === 'location') setMeetingLocation(inputValue)
    setActivePanel(null)
  }

  function getSuggestionLabel(result) {
    const a = result.address || {}
    const city = a.city || a.town || a.village || a.municipality || result.display_name
    const state = a.state || ''
    const country = a.country_code?.toUpperCase() === 'US' ? '' : (a.country || '')
    return [city, state, country].filter(Boolean).join(', ')
  }

  function handleLocationInputChange(e) {
    const value = e.target.value
    setInputValue(value)
    if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current)
    if (value.trim().length < 2) {
      setCitySuggestions([]); setShowSuggestions(false); return
    }
    autocompleteTimerRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&featuretype=city&addressdetails=1&limit=5&format=json`
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
        const results = await res.json()
        const filtered = results.filter(r =>
          r.address && (r.address.city || r.address.town || r.address.village || r.address.municipality)
        )
        setCitySuggestions(filtered.slice(0, 5))
        setShowSuggestions(filtered.length > 0)
      } catch {
        setCitySuggestions([]); setShowSuggestions(false)
      }
    }, 400)
  }

  const name = restaurant?.restaurant_name || restaurant?.name || 'Restaurant'
  const rating = restaurant?.rating ?? restaurant?.avg_rating ?? 4.5
  const cost = restaurant?.cost ?? restaurant?.price ?? restaurant?.price_level ?? '$$'
  const distanceRaw = restaurant?.distance ?? restaurant?.distance_miles
  const distance = Number.isFinite(Number(distanceRaw))
    ? `${Number(distanceRaw).toFixed(1)} mi`
    : (typeof distanceRaw === 'string' && distanceRaw.trim() ? distanceRaw : '0.3 mi')
  const imageUrl = restaurant?.image_url ?? restaurant?.imageUrl ?? null
  const matchScore = restaurant?.match_score ?? restaurant?.score ?? null
  const rawTags = Array.isArray(restaurant?.tags)
    ? restaurant.tags
    : typeof restaurant?.tags === 'string' && restaurant.tags.trim()
    ? restaurant.tags.split(',').map((t) => t.trim())
    : [restaurant?.cuisine || 'General']

  const rowValues = { date: date || null, time: time || null, location: meetingLocation || null }

  if (activePanel) {
    const activeRow = ROWS.find((r) => r.key === activePanel)
    return (
      <div className="finalized-page">
        <NavBar />
        <div className="finalized-split">
          {/* Left column — hidden on mobile when panel is open */}
          <div className="finalized-split__left">
            {ROWS.map(({ key, label, sub, Icon }) => (
              <button
                key={key}
                className={`finalized-row${activePanel === key ? ' finalized-row--active' : ''}`}
                onClick={() => openPanel(key)}
              >
                <span className="finalized-row__icon"><Icon /></span>
                <span className="finalized-row__text">
                  <span className="finalized-row__label">{label}</span>
                  <span className="finalized-row__value">{rowValues[key] || sub}</span>
                </span>
                <span className="finalized-row__chevron">&#8250;</span>
              </button>
            ))}
          </div>

          {/* Right panel — full screen on mobile */}
          <div className="finalized-split__right">
            <button className="finalized-back-btn" onClick={() => setActivePanel(null)}>&#8592;</button>
            <h2 className="finalized-panel__title">{activeRow?.title}</h2>

            {activePanel === 'date' && (
              <input
                className="finalized-panel__input"
                type="date"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            )}

            {activePanel === 'time' && (
              <select
                className="finalized-panel__input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              >
                <option value="">Select a time</option>
                {Array.from({ length: 48 }, (_, i) => {
                  const hour = Math.floor(i / 2)
                  const mins = i % 2 === 0 ? '00' : '30'
                  const ampm = hour < 12 ? 'AM' : 'PM'
                  const display = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:${mins} ${ampm}`
                  return <option key={i} value={display}>{display}</option>
                })}
              </select>
            )}

            {activePanel === 'location' && (
              <div className="finalized-location-wrap">
                <input
                  className="finalized-panel__input"
                  type="text"
                  placeholder={activeRow?.placeholder}
                  value={inputValue}
                  onChange={handleLocationInputChange}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onFocus={() => { if (citySuggestions.length > 0) setShowSuggestions(true) }}
                  autoComplete="off"
                />
                {showSuggestions && citySuggestions.length > 0 && (
                  <ul className="profile-location-suggestions" role="listbox">
                    {citySuggestions.map((result) => (
                      <li
                        key={result.place_id}
                        className="profile-location-suggestion-item"
                        role="option"
                        onMouseDown={() => {
                          setInputValue(getSuggestionLabel(result))
                          setShowSuggestions(false)
                        }}
                      >
                        {getSuggestionLabel(result)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <button className="finalized-panel__save" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="finalized-page">
      <NavBar />
      <main className="finalized-main">
        <div className="finalized-banner">
          <button className="finalized-banner__back" onClick={() => navigate(-1)}>&#8592;</button>
          {imageUrl
            ? <img src={imageUrl} alt={name} className="finalized-banner__img" />
            : <div className="finalized-banner__placeholder" />}
          {matchScore !== null && (
            <span className="finalized-match-badge">
              {Math.round(Number(matchScore))}% Match
            </span>
          )}
        </div>

        <div className="finalized-card">
          <div className="finalized-card__header">
            <span className="finalized-card__rank">#{rank}</span>
            <span className="finalized-card__name">{name}</span>
          </div>
          <div className="finalized-card__meta">
            <StarRating rating={rating} />
            <span className="finalized-card__rating-num">{rating}</span>
            <span className="finalized-card__dot">&bull;</span>
            <span>{cost}</span>
            <span className="finalized-card__dot">&bull;</span>
            <span className="finalized-card__distance">
              <PinIcon size={14} />
              {distance}
            </span>
          </div>
          <div className="finalized-card__tags">
            {rawTags.map((tag) => (
              <span
                key={tag}
                className={`finalized-tag${isDietary(tag) ? ' finalized-tag--dietary' : ''}`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="finalized-meeting">
          <h2 className="finalized-meeting__title">Meeting Details</h2>
          {ROWS.map(({ key, label, sub, Icon }) => (
            <button
              key={key}
              className="finalized-row finalized-row--full"
              onClick={() => openPanel(key)}
            >
              <span className="finalized-row__icon"><Icon /></span>
              <span className="finalized-row__text">
                <span className="finalized-row__label">{label}</span>
                <span className="finalized-row__value">{rowValues[key] || sub}</span>
              </span>
              <span className="finalized-row__chevron">&#8250;</span>
            </button>
          ))}
        </div>

        {confirmError && (
          <p className="finalized-confirm-error">{confirmError}</p>
        )}
        <button
          className="finalized-confirm-btn"
          onClick={() => {
            if (!date || !time || !meetingLocation) {
              setConfirmError('Please fill out the date, time, and location before confirming.')
              return
            }
            setConfirmError('')
            navigate('/dashboard', { state: { notified: true, restaurantName: name } })
          }}
        >
          Confirm &amp; Notify Group
        </button>
      </main>
    </div>
  )
}
