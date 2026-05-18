import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { createSession } from '../lib/partyApi'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

export default function SessionLocationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  const [selectedCoordinates, setSelectedCoordinates] = useState(null)
  const [userLocation, setUserLocation] = useState({ lat: 42.954, lng: -78.818 })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [radiusKm, setRadiusKm] = useState(5)

  const tags = location.state?.tags || []
  const selectedPartyId = sessionStorage.getItem('selectedPartyId')

  // Load Google Maps script
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key is not configured')
      return
    }

    const scriptId = 'google-maps-script'

    // Check if script is already loaded
    if (document.getElementById(scriptId)) {
      initializeMap()
      return
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`
    script.async = true
    script.defer = true

    script.onload = () => {
      initializeMap()
    }

    script.onerror = () => {
      setError('Failed to load Google Maps API')
    }

    document.head.appendChild(script)
  }, [])

  function initializeMap() {
    if (!mapContainerRef.current) {
      return
    }

    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude
          const userLng = position.coords.longitude
          setUserLocation({ lat: userLat, lng: userLng })
          createMap({ lat: userLat, lng: userLng })
        },
        () => {
          // Fallback to Buffalo if geolocation fails
          createMap(userLocation)
        }
      )
    } else {
      createMap(userLocation)
    }
  }

  function createMap(center) {
    if (mapRef.current) {
      return // Map already initialized
    }

    mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
      zoom: 14,
      center,
    })

    // Add click listener to place marker
    mapRef.current.addListener('click', (e) => {
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      placeMarker({ lat, lng })
      setSelectedCoordinates({ lat, lng })
    })

    // Place initial marker at center
    placeMarker(center)
    setSelectedCoordinates(center)
  }

  function placeMarker(location) {
    // Remove previous marker if it exists
    if (markerRef.current) {
      markerRef.current.setMap(null)
    }

    markerRef.current = new window.google.maps.Marker({
      position: location,
      map: mapRef.current,
      title: 'Selected Location',
    })

    // Center map on marker
    if (mapRef.current) {
      mapRef.current.panTo(location)
    }
  }

  async function handleConfirmLocation() {
    if (!selectedCoordinates) {
      setError('Please select a location on the map')
      return
    }

    // Get party name from sidebar selected party (stored in sessionStorage or passed via state)
    const selectedParry = localStorage.getItem('selectedPartyName') || 'Default Party'

    setIsLoading(true)
    setError(null)

    try {
      const payload = {
        tags: tags.length > 0 ? tags : ['General'],
        latitude: selectedCoordinates.lat,
        longitude: selectedCoordinates.lng,
        radius_in_meters: radiusKm * 1000,
        party_name: selectedParry,
      }

      await createSession(payload)
      navigate('/dashboard')
    } catch (err) {
      setError(`Failed to create session: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  function handleBack() {
    navigate('/session-preferences', { state: { tags } })
  }

  return (
    <div className="session-location-page">
      <NavBar />
      <main className="session-location-main">
        <div className="session-location-container">
          <div className="session-location-header">
            <h1 className="session-location__title">Where should we look?</h1>
            <p className="session-location__subtitle">Click on the map to place a marker</p>
            {tags.length > 0 && (
              <p className="session-location__tags">Tags: {tags.join(', ')}</p>
            )}
          </div>

          {error && <div className="session-location__error">{error}</div>}

          <div ref={mapContainerRef} className="session-location__map"></div>

          <div className="session-location__radius">
            <label className="session-location__radius-label">
              Search Radius: {radiusKm} km
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="session-location__radius-slider"
            />
          </div>

          {selectedCoordinates && (
            <div className="session-location__coordinates">
              <p>
                Latitude: {selectedCoordinates.lat.toFixed(4)}, Longitude:{' '}
                {selectedCoordinates.lng.toFixed(4)}
              </p>
            </div>
          )}

          <div className="session-location__actions">
            <button
              className="session-location__button session-location__button--back"
              onClick={handleBack}
              disabled={isLoading}
            >
              Back
            </button>
            <button
              className="session-location__button session-location__button--confirm"
              onClick={handleConfirmLocation}
              disabled={!selectedCoordinates || isLoading}
            >
              {isLoading ? 'Confirming...' : 'Confirm Location'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
