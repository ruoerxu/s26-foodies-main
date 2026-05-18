export default function SharedTagsList({ tags = [] }) {
  const safeTags = Array.isArray(tags) ? tags : []

  return (
    <section className="friends-profile-section friends-profile-section--shared-tags">
      <h3 className="friends-profile-section-title">Shared Tags</h3>
      {safeTags.length === 0 ? (
        <p className="friends-profile-empty">No shared tags yet.</p>
      ) : (
        <div className="friends-shared-tags-grid" role="list" aria-label="Shared restaurant tags">
          {safeTags.map((entry, index) => {
            const tag = typeof entry?.tag === 'string' && entry.tag.trim() !== '' ? entry.tag : 'Unknown'
            const displayTag = tag.replace(/_/g, ' ')
            const strength = Number.isFinite(Number(entry?.strength)) ? Math.max(0, Number(entry.strength)) : 0
            return (
              <span key={`${tag}-${index}`} className="friends-shared-tag-chip" role="listitem">
                <span className="friends-shared-tag-label">{displayTag}</span>
                <strong className="friends-shared-tag-strength">X{strength}</strong>
              </span>
            )
          })}
        </div>
      )}
    </section>
  )
}
