import { useState, useEffect } from 'react'

const NOTIFICATION_CATEGORIES = [
  {
    label: 'Members',
    items: [
      { key: 'member_joined', label: 'Member joined' },
      { key: 'member_left', label: 'Member left' },
    ],
  },
  {
    label: 'Plans',
    items: [
      { key: 'plan_finalized', label: 'Plan finalized' },
      { key: 'new_recommendations', label: 'New recommendations available' },
    ],
  },
  {
    label: 'Activity',
    items: [
      { key: 'restaurant_visited', label: 'Restaurant marked as visited' },
    ],
  },
]

const DEFAULT_PREFS = {
  member_joined: true,
  member_left: true,
  plan_finalized: true,
  new_recommendations: true,
  restaurant_visited: true,
}

function getStorageKey(partyId) {
  return `party_notifications_${partyId}`
}

function loadPrefs(partyId) {
  try {
    const stored = localStorage.getItem(getStorageKey(partyId))
    if (!stored) return { ...DEFAULT_PREFS }
    return { ...DEFAULT_PREFS, ...JSON.parse(stored) }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`notif-toggle${checked ? ' notif-toggle--on' : ' notif-toggle--off'}`}
    >
      <span className="notif-toggle__thumb" />
    </button>
  )
}

export default function NotificationsPanel({ partyId }) {
  const [prefs, setPrefs] = useState(() => loadPrefs(partyId))

  useEffect(() => {
    setPrefs(loadPrefs(partyId))
  }, [partyId])

  function toggle(key) {
    setPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(getStorageKey(partyId), JSON.stringify(next))
      return next
    })
  }

  return (
    <section className="notif-panel">
      {NOTIFICATION_CATEGORIES.map(cat => (
        <div key={cat.label} className="notif-category">
          <h3 className="notif-category__heading">{cat.label}</h3>
          {cat.items.map(item => (
            <div key={item.key} className="notif-row">
              <span className="notif-row__label">{item.label}</span>
              <Toggle checked={prefs[item.key]} onChange={() => toggle(item.key)} />
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}
