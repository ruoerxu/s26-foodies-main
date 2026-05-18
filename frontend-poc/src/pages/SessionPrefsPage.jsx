import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'

const CRAVINGS_OPTIONS = [
  'Italian',
  'Japanese',
  'Mexican',
  'Chinese',
  'Indian',
  'Thai',
  'Vietnamese',
  'Korean',
  'Mediterranean',
  'American',
  'French',
  'Spanish',
  'Vegetarian',
  'Vegan',
  'Seafood',
]

export default function SessionPrefsPage() {
  const navigate = useNavigate()
  const [selectedTags, setSelectedTags] = useState([])
  const partyName = localStorage.getItem('selectedPartyName') || 'Your Party'

  function handleTagToggle(tag) {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag)
      } else {
        return [...prev, tag]
      }
    })
  }

  function handleContinue() {
    // Navigate to location picker with selected tags in state
    navigate('/session-location', { state: { tags: selectedTags } })
  }

  function handleBack() {
    navigate('/dashboard')
  }

  return (
    <div className="session-prefs-page">
      <NavBar />
      <main className="session-prefs-main">
        <div className="session-prefs-container">
          <h1 className="session-prefs__title">{partyName}</h1>
          <p className="session-prefs__subtitle">What are you craving?</p>

          <div className="session-prefs__tags">
            {CRAVINGS_OPTIONS.map((tag) => (
              <button
                key={tag}
                className={`session-prefs__tag ${
                  selectedTags.includes(tag) ? 'session-prefs__tag--active' : ''
                }`}
                onClick={() => handleTagToggle(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="session-prefs__actions">
            <button
              className="session-prefs__button session-prefs__button--back"
              onClick={handleBack}
            >
              Back
            </button>
            <button
              className="session-prefs__button session-prefs__button--continue"
              onClick={handleContinue}
            >
              Submit Preferences
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
