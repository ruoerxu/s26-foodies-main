import { useEffect, useState } from 'react'
import NavBar from '../../components/NavBar'
import Step1PartyProfile from './Step1PartyProfile'
import Step2InviteFriends from './Step2InviteFriends'
import Step3Review from './Step3Review'
import Stepper from './Stepper'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { buildApiUrl } from '../../lib/apiBase'
import { createParty } from '../../lib/partyApi'

const MIN_STEP = 1
const MAX_STEP = 3

function clampStep(value) {
  return Math.max(MIN_STEP, Math.min(MAX_STEP, value))
}

export default function CreatePartyPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [partyName, setPartyName] = useState('')
  const [partyImage, setPartyImage] = useState(null)
  const [selectedInviteFriends, setSelectedInviteFriends] = useState([])
  const [isCreatingParty, setIsCreatingParty] = useState(false)
  const [createPartyError, setCreatePartyError] = useState('')

  const rawStep = searchParams.get('step')
  const parsedStep = Number(rawStep)
  const currentStep =
    Number.isInteger(parsedStep) && parsedStep >= MIN_STEP && parsedStep <= MAX_STEP
      ? parsedStep
      : MIN_STEP

  useEffect(() => {
    if (rawStep !== String(currentStep)) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set('step', String(currentStep))
      setSearchParams(nextParams, { replace: true })
    }
  }, [currentStep, rawStep, searchParams, setSearchParams])

  function getLogoutUrl() {
    return buildApiUrl('/src/logout.php')
  }

  async function handleLogout() {
    try {
      await fetch(getLogoutUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
    } catch {
      // Continue logout locally even if server logout fails.
    } finally {
      localStorage.removeItem('isLoggedIn')
      navigate('/login', { replace: true })
    }
  }

  function setStepInUrl(step, replace = false) {
    const nextStep = clampStep(step)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('step', String(nextStep))
    setSearchParams(nextParams, { replace })
  }

  function handleNext() {
    setStepInUrl(currentStep + 1)
  }

  function handleBack() {
    setStepInUrl(currentStep - 1)
  }

  async function handleCreateParty() {
    if (isCreatingParty) {
      return
    }

    setCreatePartyError('')
    setIsCreatingParty(true)

    const normalizedPartyName = partyName.trim() || 'Untitled Party'
    const invitedFriends = selectedInviteFriends
      .map((friend) => {
        if (typeof friend === 'object' && friend !== null) {
          return Number(friend.user_id)
        }

        return Number(friend)
      })
      .filter((friendId) => Number.isInteger(friendId) && friendId > 0)

    try {
      const formData = new FormData()
      formData.append('name', normalizedPartyName)
      formData.append('invited_friends', JSON.stringify(invitedFriends))
      if (partyImage) {
        formData.append('image', partyImage)
      }

      const data = await createParty(formData)
      if (data?.success !== true) {
        throw new Error(data?.message || 'Failed to create party.')
      }

      navigate('/dashboard', { replace: true })
    } catch (error) {
      setCreatePartyError(error.message || 'Failed to create party.')
    } finally {
      setIsCreatingParty(false)
    }
  }

  return (
    <div className="create-party-page">
      <NavBar onLogout={handleLogout} />

      <main className="create-party-main">
        <Stepper currentStep={currentStep} totalSteps={3} />

        <section className="create-party-card" aria-label="Create party form">
          {currentStep === 1 && (
            <Step1PartyProfile
              partyName={partyName}
              onPartyNameChange={setPartyName}
              partyImage={partyImage}
              onPartyImageChange={setPartyImage}
              onNext={handleNext}
            />
          )}

          {currentStep === 2 && (
            <Step2InviteFriends
              selectedFriends={selectedInviteFriends}
              onSelectedFriendsChange={setSelectedInviteFriends}
              onBack={handleBack}
              onNext={handleNext}
            />
          )}
          {currentStep === 3 && (
            <Step3Review
              partyName={partyName}
              selectedFriends={selectedInviteFriends}
              onBack={handleBack}
              onCreate={handleCreateParty}
              isCreating={isCreatingParty}
              createError={createPartyError}
            />
          )}
        </section>
      </main>
    </div>
  )
}
