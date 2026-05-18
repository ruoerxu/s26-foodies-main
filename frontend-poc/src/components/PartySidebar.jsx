function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5V19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function PlaceholderImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 16L10 12.5L13.2 15.7L15 13.9L17.5 16.4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="1.4" fill="currentColor" />
    </svg>
  )
}

export default function PartySidebar({
  onCreateClick,
  isCreateActive = false,
  parties = [],
  selectedPartyId = '',
  onPartySelect,
}) {
  return (
    <aside className="party-sidebar" aria-label="Party list sidebar">
      <h2 className="party-sidebar__title">Your Parties:</h2>
      <div className="party-sidebar__list">
        <button
          type="button"
          className={`party-card party-card--create${isCreateActive ? ' party-card--active' : ''}`}
          onClick={onCreateClick}
        >
          <span className="party-card__avatar party-card__avatar--create">
            <PlusIcon />
          </span>
          <span className="party-card__name party-card__name--create">Create</span>
        </button>

        {parties.map((party) => {
          const isActive = selectedPartyId === party.id

          return (
            <button
              key={party.id}
              type="button"
              className="party-card"
              onClick={() => onPartySelect?.(party.id)}
              aria-pressed={isActive}
            >
              <span className={`party-card__avatar${isActive ? ' is-active' : ''}`}>
                {party.imageUrl ? (
                  <img className="party-card__avatar-image" src={party.imageUrl} alt={`${party.name} profile`} />
                ) : (
                  <PlaceholderImageIcon />
                )}
              </span>
              <span className="party-card__name">{party.name}</span>
              <span className="party-card__members">{party.members} members</span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
