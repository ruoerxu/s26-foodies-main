import { useEffect, useState } from 'react'
import cameraIcon from '../../assets/camera 1.svg'
import clearNameIcon from '../../assets/X-circle.svg'

function PlusIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 3.5V14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3.5 9H14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function Step1PartyProfile({
  partyName,
  onPartyNameChange,
  partyImage,
  onPartyImageChange,
  onNext,
}) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    if (!partyImage) {
      setPreviewUrl('')
      return
    }

    const objectUrl = URL.createObjectURL(partyImage)
    setPreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [partyImage])

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null
    onPartyImageChange(file)
  }

  function handleNameChange(event) {
    const value = event.target.value
    onPartyNameChange(value)

    if (value.trim()) {
      setNameError('')
    }
  }

  function handleNextClick() {
    if (!partyName.trim()) {
      setNameError('You need a party name.')
      return
    }

    setNameError('')
    onNext()
  }

  function handleClearName() {
    onPartyNameChange('')
    setNameError('')
  }

  return (
    <div className="party-profile-step">
      <div className="party-profile-step__upload-wrap">
        <label className="party-profile-step__upload" htmlFor="party-image-upload">
          <input
            id="party-image-upload"
            type="file"
            accept="image/*"
            className="party-profile-step__upload-input"
            onChange={handleFileChange}
          />
          {previewUrl ? (
            <img className="party-profile-step__upload-preview" src={previewUrl} alt="Party profile preview" />
          ) : (
            <>
              <span className="party-profile-step__upload-icon">
                <img src={cameraIcon} alt="" aria-hidden="true" />
              </span>
              <span className="party-profile-step__upload-label">UPLOAD</span>
            </>
          )}
          {!previewUrl && (
            <span className="party-profile-step__upload-plus" aria-hidden="true">
              <PlusIcon />
            </span>
          )}
        </label>
      </div>

      <h1 className="party-profile-step__title">Create Your Party</h1>

      <div className="party-profile-step__field">
        <label htmlFor="party-name-input">Party Name</label>
        <div className="party-profile-step__input-wrap">
          <input
            id="party-name-input"
            type="text"
            value={partyName}
            placeholder="e.g., Friday Lunch Crew"
            onChange={handleNameChange}
            aria-invalid={nameError ? 'true' : 'false'}
            aria-describedby={nameError ? 'party-name-error' : undefined}
          />
          {partyName ? (
            <button
              type="button"
              className="party-profile-step__clear-btn"
              onClick={handleClearName}
              aria-label="Clear party name"
            >
              <img src={clearNameIcon} alt="" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {nameError && (
          <p id="party-name-error" className="party-profile-step__error" role="alert">
            {nameError}
          </p>
        )}
      </div>

      <div className="party-profile-step__actions">
        <button type="button" className="party-profile-step__next" onClick={handleNextClick}>
          Next
        </button>
      </div>
    </div>
  )
}
