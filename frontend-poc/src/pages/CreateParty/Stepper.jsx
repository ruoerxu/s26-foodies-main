export default function Stepper({ currentStep, totalSteps = 4 }) {
  const stepCount = Math.max(1, totalSteps)

  return (
    <ol className="create-party-stepper" aria-label="Create party progress">
      {Array.from({ length: stepCount }, (_, index) => index + 1).map((step) => {
        const active = step === currentStep

        return (
          <li key={step} className="create-party-stepper__item">
            <span
              className={`create-party-stepper__dot${active ? ' create-party-stepper__dot--active' : ''}`}
              aria-current={active ? 'step' : undefined}
            >
              {step}
            </span>
            {step < stepCount && <span className="create-party-stepper__connector" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}
