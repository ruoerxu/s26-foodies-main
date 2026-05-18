import { useEffect } from "react";

function StarButton({ filled, onClick, disabled, index }) {
  return (
    <button
      type="button"
      className={`rating-modal__star${filled ? " rating-modal__star--filled" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Rate ${index} star${index > 1 ? "s" : ""}`}
    >
      ★
    </button>
  );
}

export default function RatingModal({
  isOpen,
  restaurantName,
  rating,
  onRatingChange,
  onCancel,
  onSubmit,
  isSubmitting,
  error,
}) {
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event) {
      if (event.key === "Escape" && !isSubmitting) {
        onCancel();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isSubmitting, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="rating-modal__backdrop"
      onClick={() => {
        if (!isSubmitting) onCancel();
      }}
      role="presentation"
    >
      <div
        className="rating-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rating-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="rating-modal-title" className="rating-modal__title">
          Rate {restaurantName}
        </h3>
        <p className="rating-modal__subtitle">
          Choose your rating before marking this restaurant as visited.
        </p>

        <div className="rating-modal__stars" role="radiogroup" aria-label="Restaurant rating">
          {Array.from({ length: 5 }, (_, idx) => {
            const starNumber = idx + 1;
            return (
              <StarButton
                key={starNumber}
                index={starNumber}
                filled={starNumber <= rating}
                disabled={isSubmitting}
                onClick={() => onRatingChange(starNumber)}
              />
            );
          })}
        </div>

        <p className="rating-modal__selected">Selected: {rating} / 5</p>
        {error ? <p className="rating-modal__error">{error}</p> : null}

        <div className="rating-modal__actions">
          <button
            type="button"
            className="rating-modal__btn rating-modal__btn--cancel"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rating-modal__btn rating-modal__btn--submit"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
