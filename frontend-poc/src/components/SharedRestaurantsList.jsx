export default function SharedRestaurantsList({ restaurants = [], friendName = 'Friend' }) {
  const safeRestaurants = Array.isArray(restaurants) ? restaurants : []

  const avgGlobal = (() => {
    const values = safeRestaurants
      .map((item) => Number(item?.global_rating))
      .filter((value) => Number.isFinite(value) && value > 0)
    if (!values.length) return 0
    return values.reduce((sum, value) => sum + value, 0) / values.length
  })()

  const formatRating = (value) => {
    const num = Number(value)
    if (!Number.isFinite(num) || num <= 0) {
      return 'N/A'
    }
    return `${num.toFixed(1)} / 5`
  }

  const renderDelta = (label, rating) => {
    const num = Number(rating)
    if (!Number.isFinite(num) || num <= 0 || avgGlobal <= 0) {
      return <span className="friends-shared-restaurants-delta">{label}: N/A vs avg</span>
    }

    const delta = num - avgGlobal
    const sign = delta > 0 ? '+' : ''
    const tone = delta >= 0 ? 'friends-shared-restaurants-delta--up' : 'friends-shared-restaurants-delta--down'
    return (
      <span className={`friends-shared-restaurants-delta ${tone}`}>
        {label}: {sign}{delta.toFixed(1)} vs avg
      </span>
    )
  }

  return (
    <section className="friends-profile-section friends-profile-section--shared-restaurants">
      <h3 className="friends-profile-section-title">Shared Restaurants</h3>
      {safeRestaurants.length === 0 ? (
        <p className="friends-profile-empty">No shared restaurants yet.</p>
      ) : (
        <div className="friends-shared-restaurants-list">
          {safeRestaurants.map((restaurant, index) => (
            <article
              key={`${restaurant?.name || 'restaurant'}-${index}`}
              className="friends-shared-restaurants-card"
            >
              <div className="friends-shared-restaurants-card-main">
                <p className="friends-shared-restaurants-name">{restaurant?.name || 'Unknown Restaurant'}</p>
                <div className="friends-shared-restaurants-badges">
                  <span className="friends-shared-rating-badge friends-shared-rating-badge--you">
                    You: {formatRating(restaurant?.user_rating)}
                  </span>
                  <span className="friends-shared-rating-badge friends-shared-rating-badge--friend">
                    {friendName}: {formatRating(restaurant?.friend_rating)}
                  </span>
                  <span className="friends-shared-rating-badge friends-shared-rating-badge--global">
                    Global: {formatRating(restaurant?.global_rating)}
                  </span>
                </div>
              </div>
              <div className="friends-shared-restaurants-deltas" role="note" aria-label="Compared to average rating">
                {renderDelta('You', restaurant?.user_rating)}
                {renderDelta(friendName, restaurant?.friend_rating)}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
