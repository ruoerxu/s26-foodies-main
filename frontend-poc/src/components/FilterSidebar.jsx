import React from "react";

const MODE_OPTIONS = [
  { value: "walking", label: "Walking", icon: "🚶", estimate: "~1 mi" },
  { value: "biking", label: "Biking", icon: "🚴", estimate: "~3 mi" },
  { value: "driving", label: "Driving", icon: "🚗", estimate: "10+ mi" },
];

const CUISINE_OPTIONS = [
  "American",
  "Chinese",
  "Indian",
  "Italian",
  "Japanese",
  "Korean",
  "Mediterranean",
  "Mexican",
  "Thai",
  "Vietnamese",
];

const PRICE_LEVELS = ["$", "$$", "$$$", "$$$$"];

function parseTimeInput(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) {
    return null;
  }

  const [, hourRaw, minuteRaw, meridiemRaw] = match;
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const meridiem = meridiemRaw.toUpperCase();

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return null;
  }

  const normalizedHour = hour % 12;
  return normalizedHour * 60 + minute + (meridiem === "PM" ? 12 * 60 : 0);
}

function normalizeTimeInput(value) {
  const parsedMinutes = parseTimeInput(value);
  if (parsedMinutes === null) {
    return value;
  }

  const hours24 = Math.floor(parsedMinutes / 60);
  const minutes = parsedMinutes % 60;
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hour12 = hours24 % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${meridiem}`;
}

function getTimeWindowError(startTime, endTime) {
  const hasStart = Boolean(startTime.trim());
  const hasEnd = Boolean(endTime.trim());

  if (!hasStart && !hasEnd) {
    return "";
  }

  if (!hasStart || !hasEnd) {
    return "Enter both a start time and an end time.";
  }

  const parsedStart = parseTimeInput(startTime);
  const parsedEnd = parseTimeInput(endTime);

  if (parsedStart === null || parsedEnd === null) {
    return "Enter time as H:MM AM/PM.";
  }

  if (parsedStart >= parsedEnd) {
    return "Start time must be earlier than end time.";
  }

  return "";
}

function getNormalizedTimeWindow(startTime, endTime) {
  const trimmedStart = startTime.trim();
  const trimmedEnd = endTime.trim();

  if (!trimmedStart && !trimmedEnd) {
    return { start: "", end: "" };
  }

  return {
    start: normalizeTimeInput(trimmedStart),
    end: normalizeTimeInput(trimmedEnd),
  };
}

export default function FilterSidebar({
  maxDist,
  mode,
  cuisines,
  priceLevels,
  timeWindow,
  onMaxDistChange,
  onModeChange,
  onCuisineToggle,
  onPriceLevelToggle,
  onTimeWindowChange,
  onReset,
  onClose,
}) {
  const [draftStartTime, setDraftStartTime] = React.useState(timeWindow?.start ?? "");
  const [draftEndTime, setDraftEndTime] = React.useState(timeWindow?.end ?? "");

  React.useEffect(() => {
    setDraftStartTime(timeWindow?.start ?? "");
    setDraftEndTime(timeWindow?.end ?? "");
  }, [timeWindow?.start, timeWindow?.end]);

  const sliderPercent = ((maxDist - 0.5) / (15 - 0.5)) * 100;
  const distanceLabel = Number.isInteger(maxDist)
    ? `${maxDist} mi`
    : `${maxDist.toFixed(1)} mi`;
  const timeWindowError = getTimeWindowError(draftStartTime, draftEndTime);
  const normalizedDraftTimeWindow = getNormalizedTimeWindow(
    draftStartTime,
    draftEndTime,
  );

  React.useEffect(() => {
    if (timeWindowError) {
      return;
    }

    if (
      normalizedDraftTimeWindow.start === (timeWindow?.start ?? "") &&
      normalizedDraftTimeWindow.end === (timeWindow?.end ?? "")
    ) {
      return;
    }

    onTimeWindowChange(normalizedDraftTimeWindow);
  }, [
    normalizedDraftTimeWindow,
    onTimeWindowChange,
    timeWindow?.end,
    timeWindow?.start,
    timeWindowError,
  ]);

  function handleSidebarClose() {
    onClose();
  }

  function handleResetAll() {
    setDraftStartTime("");
    setDraftEndTime("");
    onReset();
  }

  return (
    <aside className="filter-sidebar">
      <div className="filter-sidebar__header">
        <h2 className="filter-sidebar__title">Filters</h2>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleResetAll}
            className="filter-sidebar__reset"
          >
            Clear All Filters
          </button>
          <button
            type="button"
            onClick={handleSidebarClose}
            className="filter-sidebar__close"
            aria-label="Close filters"
          >
            ×
          </button>
        </div>
      </div>

      <div className="filter-sidebar__section">
        <p className="filter-sidebar__section-title">Time Window</p>
        <div className="filter-time-window">
          <label className="filter-time-window__field">
            <span className="filter-time-window__label">Start Time</span>
            <input
              type="text"
              inputMode="text"
              placeholder="6:00 PM"
              aria-label="Start Time"
              value={draftStartTime}
              onChange={(event) => setDraftStartTime(event.target.value)}
              onBlur={() =>
                setDraftStartTime((currentValue) =>
                  currentValue.trim()
                    ? normalizeTimeInput(currentValue)
                    : currentValue,
                )
              }
              className="filter-time-window__input"
            />
          </label>
          <label className="filter-time-window__field">
            <span className="filter-time-window__label">End Time</span>
            <input
              type="text"
              inputMode="text"
              placeholder="8:00 PM"
              aria-label="End Time"
              value={draftEndTime}
              onChange={(event) => setDraftEndTime(event.target.value)}
              onBlur={() =>
                setDraftEndTime((currentValue) =>
                  currentValue.trim()
                    ? normalizeTimeInput(currentValue)
                    : currentValue,
                )
              }
              className="filter-time-window__input"
            />
          </label>
        </div>
        {timeWindowError && (
          <p className="filter-time-window__error" role="alert">
            {timeWindowError}
          </p>
        )}
      </div>

      <div className="filter-distance-section">
        <h3 className="filter-distance-title">Distance</h3>
        <div className="filter-distance-header">
          <span className="filter-distance-subtitle">
            Up to {maxDist.toFixed(1)} miles
          </span>
          <span className="filter-distance-value">{distanceLabel}</span>
        </div>
        <input
          id="max-distance"
          type="range"
          min="0.5"
          max="15"
          step="0.5"
          value={maxDist}
          onChange={(event) => onMaxDistChange(Number(event.target.value))}
          className="filter-distance-slider"
          style={{
            background: `linear-gradient(to right, #030620 0%, #030620 ${sliderPercent}%, #e5e7eb ${sliderPercent}%, #e5e7eb 100%)`,
          }}
        />
        <div className="filter-distance-scale">
          <span>0 mi</span>
          <span>15 mi</span>
        </div>
        <div className="filter-distance-divider" />
        <div className="filter-distance-modes">
          {MODE_OPTIONS.map((option) => {
            const isActive = mode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onModeChange(option.value)}
                className={`filter-distance-mode ${
                  isActive
                    ? "filter-distance-mode--active"
                    : "filter-distance-mode--inactive"
                }`}
              >
                <span className="filter-distance-mode-label">
                  <span aria-hidden="true">{option.icon}</span>
                  <span>{option.label}</span>
                </span>
                <span className="filter-distance-mode-estimate">
                  {option.estimate}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="filter-sidebar__section">
        <p className="filter-sidebar__section-title">Cuisines</p>
        <div className="filter-sidebar__chips">
          {CUISINE_OPTIONS.map((cuisine) => {
            const isSelected = cuisines.includes(cuisine);
            return (
              <button
                key={cuisine}
                type="button"
                onClick={() => onCuisineToggle(cuisine)}
                className={`filter-sidebar__chip ${
                  isSelected
                    ? "filter-sidebar__chip--selected"
                    : "filter-sidebar__chip--default"
                }`}
              >
                {isSelected && (
                  <span className="filter-sidebar__chip-check">✓</span>
                )}
                {cuisine}
              </button>
            );
          })}
        </div>
      </div>
      <div className="filter-sidebar__section">
        <p className="filter-sidebar__section-title">Price Range</p>
        <div className="filter-sidebar__chips">
          {PRICE_LEVELS.map((priceLevel) => {
            const isSelected = priceLevels.includes(priceLevel);
            return (
              <button
                key={priceLevel}
                type="button"
                onClick={() => onPriceLevelToggle(priceLevel)}
                className={`filter-sidebar__chip ${
                  isSelected
                    ? "filter-sidebar__chip--selected"
                    : "filter-sidebar__chip--default"
                }`}
              >
                {isSelected && (
                  <span className="filter-sidebar__chip-check">✓</span>
                )}
                {priceLevel}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
