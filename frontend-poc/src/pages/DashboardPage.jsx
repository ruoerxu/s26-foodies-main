import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../components/NavBar";
import PartySidebar from "../components/PartySidebar";
import FilterSidebar from "../components/FilterSidebar";
import RatingModal from "../components/RatingModal";
import { buildApiUrl } from "../lib/apiBase";
import {
  getParties,
  getRecommendations,
  checkSessionActive,
  clearSession,
  getVisited,
  markVisitedWithRating,
  removeVisited,
} from "../lib/partyApi";

const SELECTED_PARTY_ID_STORAGE_KEY = "selectedPartyId";
const SELECTED_PARTY_NAME_STORAGE_KEY = "selectedPartyName";
const SELECTED_PARTY_IMAGE_STORAGE_KEY = "selectedPartyImageUrl";

const GOOGLE_TYPE_TO_CUISINE = {
  // American
  american_restaurant: "American",
  californian_restaurant: "American",
  diner: "American",
  hamburger_restaurant: "American",
  hot_dog_restaurant: "American",
  hot_dog_stand: "American",
  steak_house: "American",
  // Chinese
  chinese_restaurant: "Chinese",
  chinese_noodle_restaurant: "Chinese",
  dumpling_restaurant: "Chinese",
  // Indian
  indian_restaurant: "Indian",
  // Italian
  italian_restaurant: "Italian",
  pizza_restaurant: "Italian",
  // Japanese
  japanese_restaurant: "Japanese",
  sushi_restaurant: "Japanese",
  ramen_restaurant: "Japanese",
  japanese_curry_restaurant: "Japanese",
  japanese_izakaya_restaurant: "Japanese",
  // Korean
  korean_restaurant: "Korean",
  korean_barbecue_restaurant: "Korean",
  // Mediterranean
  mediterranean_restaurant: "Mediterranean",
  greek_restaurant: "Mediterranean",
  lebanese_restaurant: "Mediterranean",
  turkish_restaurant: "Mediterranean",
  // Mexican
  mexican_restaurant: "Mexican",
  taco_restaurant: "Mexican",
  tex_mex_restaurant: "Mexican",
  burrito_restaurant: "Mexican",
  // Thai
  thai_restaurant: "Thai",
  // Vietnamese
  vietnamese_restaurant: "Vietnamese",
};

const KNOWN_CUISINES = new Set([
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
]);

const GENERIC_TAGS = new Set([
  "restaurant",
  "food",
  "establishment",
  "point_of_interest",
  "store",
  "premise",
  "route",
  "locality",
  "political",
  "sublocality",
  "neighborhood",
  "geocode",
  "meal_takeaway",
  "meal_delivery",
  "takeout",
]);

function getCuisineLabels(item) {
  if (item?.label) return [item.label];
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  const mapped = [
    ...new Set(tags.map((t) => GOOGLE_TYPE_TO_CUISINE[t]).filter(Boolean)),
  ];
  if (mapped.length > 0) return mapped;
  const direct = [...new Set(tags.filter((t) => KNOWN_CUISINES.has(t)))];
  if (direct.length > 0) return direct;
  if (item?.cuisine) return [item.cuisine];
  return [];
}

function getVenueTags(item) {
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  return [
    ...new Set(
      tags
        .filter(
          (t) =>
            !GOOGLE_TYPE_TO_CUISINE[t] &&
            !KNOWN_CUISINES.has(t) &&
            !GENERIC_TAGS.has(t),
        )
        .map((t) =>
          t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        ),
    ),
  ];
}

const DIETARY_KEYWORDS = [
  "vegetarian",
  "vegan",
  "gluten",
  "gf",
  "halal",
  "kosher",
];
function isDietary(label) {
  return DIETARY_KEYWORDS.some((k) => label.toLowerCase().includes(k));
}

function renderStars(rating) {
  const num = Number(rating) || 0;
  const full = Math.floor(num);
  return Array.from({ length: 5 }, (_, i) => (
    <span
      key={i}
      className={i < full ? "dash-star dash-star--filled" : "dash-star"}
    >
      ★
    </span>
  ));
}

function toMemberCount(rawParty) {
  const numericCandidates = [
    rawParty?.members,
    rawParty?.member_count,
    rawParty?.memberCount,
    rawParty?.member_amount,
    rawParty?.member_acount,
    rawParty?.count,
  ];

  for (const value of numericCandidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      // Backend totals often include organizer; sidebar should show invited members.
      return Math.max(0, parsed - 1);
    }
  }

  const arrayCandidates = [
    rawParty?.party_members,
    rawParty?.members_list,
    rawParty?.member_list,
    rawParty?.members_usernames,
    rawParty?.member_usernames,
    rawParty?.invited_friends,
  ];

  for (const value of arrayCandidates) {
    if (Array.isArray(value)) {
      return value.length;
    }
  }

  return 0;
}

const MODE_DISTANCE_PRESETS = {
  walking: 1,
  biking: 3,
  driving: 10,
};

const EMPTY_TIME_WINDOW = {
  start: "",
  end: "",
};

function getStoredUserId() {
  const raw =
    localStorage.getItem("user_id") ||
    localStorage.getItem("userId") ||
    sessionStorage.getItem("user_id") ||
    sessionStorage.getItem("userId");
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { state: routeState } = useLocation()
  const [parties, setParties] = useState([])
  const [selectedPartyId, setSelectedPartyId] = useState(() =>
    sessionStorage.getItem(SELECTED_PARTY_ID_STORAGE_KEY) || ''
  )
  const [recommendedRestaurants, setRecommendedRestaurants] = useState([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [maxDist, setMaxDist] = useState(MODE_DISTANCE_PRESETS.driving)
  const [travelMode, setTravelMode] = useState('driving')
  const [selectedCuisines, setSelectedCuisines] = useState([])
  const [selectedPriceLevels, setSelectedPriceLevels] = useState([])
  const [appliedTimeWindow, setAppliedTimeWindow] = useState(EMPTY_TIME_WINDOW)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [visitedIds, setVisitedIds] = useState(new Set())
  const [showVisited, setShowVisited] = useState(false)
  const [currentUserId] = useState(() => getStoredUserId())
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false)
  const [selectedPlaceForRating, setSelectedPlaceForRating] = useState(null)
  const [selectedVisitedId, setSelectedVisitedId] = useState('')
  const [selectedStarRating, setSelectedStarRating] = useState(5)
  const [ratingModalError, setRatingModalError] = useState('')
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)
  const [notifyToast, setNotifyToast] = useState(() =>
    routeState?.notified ? routeState.restaurantName : null,
  );

  useEffect(() => {
    if (!notifyToast) return;
    const timer = setTimeout(() => setNotifyToast(null), 4000);
    return () => clearTimeout(timer);
  }, [notifyToast]);

  function getPartyName() {
    return (
      parties.find((p) => p.id === selectedPartyId)?.name?.trim() ||
      localStorage.getItem(SELECTED_PARTY_NAME_STORAGE_KEY) ||
      ""
    );
  }

  async function handleToggleVisited(id) {
    const wasVisited = visitedIds.has(id);
    if (!wasVisited) {
      return;
    }

    setVisitedIds((prev) => {
      const next = new Set(prev);
      if (wasVisited) next.delete(id);
      else next.add(id);
      return next;
    });
    const partyName = getPartyName();
    if (!partyName) return;
    try {
      await removeVisited(partyName, id);
    } catch {
      // backend not yet available — local state already updated
    }
  }

  function openRatingModal(place, itemId) {
    setSelectedPlaceForRating(place);
    setSelectedVisitedId(itemId);
    setSelectedStarRating(5);
    setRatingModalError("");
    setIsRatingModalOpen(true);
  }

  function closeRatingModal() {
    if (isSubmittingRating) return;
    setIsRatingModalOpen(false);
    setSelectedPlaceForRating(null);
    setSelectedVisitedId("");
    setSelectedStarRating(5);
    setRatingModalError("");
  }

  async function handleSubmitVisitedWithRating() {
    if (!selectedPlaceForRating || !selectedVisitedId) {
      setRatingModalError("Missing restaurant data.");
      return;
    }

    const partyId = Number(selectedPartyId);
    if (!Number.isInteger(partyId) || partyId <= 0) {
      setRatingModalError("Please select a valid party.");
      return;
    }

    const userId = currentUserId ?? getStoredUserId();
    if (!Number.isInteger(userId) || userId <= 0) {
      setRatingModalError("Unable to determine your user id. Please log in again.");
      return;
    }

    const restaurantId =
      selectedPlaceForRating?.place_id ||
      selectedPlaceForRating?.id ||
      selectedPlaceForRating?.restaurant_id ||
      selectedVisitedId;
    const restaurantName =
      selectedPlaceForRating?.name ||
      selectedPlaceForRating?.restaurant_name ||
      "Unknown Restaurant";
    const tagsArray = Array.isArray(selectedPlaceForRating?.types)
      ? selectedPlaceForRating.types
      : Array.isArray(selectedPlaceForRating?.tags)
        ? selectedPlaceForRating.tags
        : [];

    setIsSubmittingRating(true);
    setRatingModalError("");

    try {
      await markVisitedWithRating({
        userId,
        partyId,
        restaurantId,
        name: restaurantName,
        tags: JSON.stringify(tagsArray),
        rating: selectedStarRating,
      });

      setVisitedIds((prev) => {
        const next = new Set(prev);
        next.add(selectedVisitedId);
        return next;
      });
      closeRatingModal();
    } catch (err) {
      setRatingModalError(
        err instanceof Error ? err.message : "Unable to save your rating.",
      );
    } finally {
      setIsSubmittingRating(false);
    }
  }

  function getLogoutUrl() {
    return buildApiUrl("/src/logout.php");
  }

  async function handleLogout() {
    try {
      await fetch(getLogoutUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } catch {
      // Continue logout locally even if server logout fails.
    } finally {
      localStorage.removeItem("isLoggedIn");
      navigate("/login", { replace: true });
    }
  }

  async function getUserCoordinates() {
    const fallbackLat = 42.954;
    const fallbackLon = -78.818;

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: fallbackLat, lon: fallbackLon });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        () => {
          resolve({ lat: fallbackLat, lon: fallbackLon });
        },
      );
    });
  }

  async function handleClearSession() {
    if (!selectedPartyId) {
      return;
    }

    const selectedParty = parties.find((p) => p.id === selectedPartyId);
    const partyName = selectedParty?.name?.trim() ?? "";
    if (!partyName) {
      return;
    }

    try {
      await clearSession(partyName);
      setIsSessionActive(false);
      setRecommendedRestaurants([]);
      setSelectedCuisines([]);
    } catch {
      // silently fail — local state unchanged
    }
  }

  function handleStartSession() {
    navigate("/session-preferences");
  }

  function handleCuisineToggle(cuisine) {
    setSelectedCuisines((prev) => {
      if (prev.includes(cuisine)) {
        return prev.filter((item) => item !== cuisine);
      }
      return [...prev, cuisine];
    });
  }

  function handlePriceLevelToggle(priceLevel) {
    setSelectedPriceLevels((prev) => {
      if (prev.includes(priceLevel)) {
        return prev.filter((item) => item !== priceLevel);
      }
      return [...prev, priceLevel];
    });
  }

  function handleResetFilters() {
    setMaxDist(MODE_DISTANCE_PRESETS.driving);
    setTravelMode("driving");
    setSelectedCuisines([]);
    setSelectedPriceLevels([]);
    setAppliedTimeWindow(EMPTY_TIME_WINDOW);
  }

  function handleModeChange(nextMode) {
    const presetDistance =
      MODE_DISTANCE_PRESETS[nextMode] ?? MODE_DISTANCE_PRESETS.driving;
    setTravelMode(nextMode);
    setMaxDist(presetDistance);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadParties() {
      try {
        const data = await getParties();
        const incoming = Array.isArray(data?.parties) ? data.parties : [];
        if (cancelled) {
          return;
        }

        const normalized = incoming
          .map((party) => ({
            id: String(party.id ?? ""),
            name: party.name ?? "",
            imageUrl: party.image_url ?? "",
            members: toMemberCount(party),
          }))
          .filter((party) => party.id && party.name);

        setParties(normalized);
      } catch {
        // Keep sidebar empty when endpoint is missing/unavailable.
      }
    }

    loadParties();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPartyId) {
      sessionStorage.removeItem(SELECTED_PARTY_ID_STORAGE_KEY);
      localStorage.removeItem(SELECTED_PARTY_NAME_STORAGE_KEY);
      localStorage.removeItem(SELECTED_PARTY_IMAGE_STORAGE_KEY);
      return;
    }

    sessionStorage.setItem(SELECTED_PARTY_ID_STORAGE_KEY, selectedPartyId);

    const selectedParty = parties.find(
      (party) => String(party.id) === String(selectedPartyId),
    );
    if (selectedParty?.name) {
      localStorage.setItem(SELECTED_PARTY_NAME_STORAGE_KEY, selectedParty.name);
    }
    if (selectedParty) {
      localStorage.setItem(SELECTED_PARTY_IMAGE_STORAGE_KEY, selectedParty.imageUrl ?? "");
    }
  }, [selectedPartyId, parties]);

  useEffect(() => {
    if (!selectedPartyId || parties.length === 0) {
      return;
    }

    const partyStillExists = parties.some(
      (party) => party.id === selectedPartyId,
    );
    if (!partyStillExists) {
      setSelectedPartyId("");
    }
  }, [selectedPartyId, parties]);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      if (!selectedPartyId) {
        setIsSessionActive(false);
        return;
      }

      const selectedParty = parties.find((p) => p.id === selectedPartyId);
      const partyName = selectedParty?.name?.trim() ?? "";
      if (!partyName) {
        setIsSessionActive(false);
        return;
      }

      try {
        const data = await checkSessionActive(partyName);
        if (cancelled) {
          return;
        }

        const isActive =
          data?.is_session_active === true || data?.is_session_active === 1;
        setIsSessionActive(isActive);
        if (isActive && Array.isArray(data?.selected_cuisines) && data.selected_cuisines.length > 0) {
          setSelectedCuisines(data.selected_cuisines);
        } else if (!isActive) {
          setSelectedCuisines([]);
        }
      } catch {
        if (!cancelled) {
          setIsSessionActive(false);
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [selectedPartyId, parties]);

  useEffect(() => {
    let cancelled = false;

    async function loadVisited() {
      if (!selectedPartyId) {
        setVisitedIds(new Set());
        return;
      }
      const partyName =
        parties.find((p) => p.id === selectedPartyId)?.name?.trim() ?? "";
      if (!partyName) return;
      try {
        const data = await getVisited(partyName);
        if (cancelled) return;
        const ids = Array.isArray(data?.visited) ? data.visited : [];
        setVisitedIds(new Set(ids));
      } catch {
        // backend not yet available — keep local state
      }
    }

    loadVisited();
    return () => {
      cancelled = true;
    };
  }, [selectedPartyId, parties]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      if (!selectedPartyId) {
        setRecommendedRestaurants([]);
        return;
      }

      const selectedParty = parties.find((p) => p.id === selectedPartyId);
      const partyName = selectedParty?.name?.trim() ?? "";
      if (!partyName) {
        setRecommendedRestaurants([]);
        return;
      }

      setIsLoadingRecommendations(true);
      try {
        const { lat, lon } = await getUserCoordinates();
        if (cancelled) {
          return;
        }

        const data = await getRecommendations(partyName, lat, lon, {
          maxDist,
          mode: travelMode,
          cuisines: selectedCuisines,
          price: selectedPriceLevels,
          startTime: appliedTimeWindow.start,
          endTime: appliedTimeWindow.end,
        });
        if (cancelled) {
          return;
        }

        const incoming = Array.isArray(data)
          ? data
          : Array.isArray(data?.recommendations)
            ? data.recommendations
            : [];
        setRecommendedRestaurants(incoming);
      } catch {
        if (!cancelled) {
          setRecommendedRestaurants([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRecommendations(false);
        }
      }
    }

    loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, [
    selectedPartyId,
    parties,
    maxDist,
    travelMode,
    selectedCuisines,
    selectedPriceLevels,
    appliedTimeWindow,
  ]);

  return (
    <div className="dashboard-page">
      <NavBar onLogout={handleLogout} />
      {notifyToast && (
        <div className="dashboard-notify-toast">
          <span className="dashboard-notify-toast__icon">✓</span>
          Group notified about <strong>{notifyToast}</strong>
          <button
            className="dashboard-notify-toast__close"
            onClick={() => setNotifyToast(null)}
          >
            ✕
          </button>
        </div>
      )}
      <main className="dashboard-main">
        <PartySidebar
          onCreateClick={() => navigate("/create-party")}
          isCreateActive={false}
          parties={parties}
          selectedPartyId={selectedPartyId}
          onPartySelect={setSelectedPartyId}
        />
        <section className="dashboard-content" aria-live="polite">
          <div className="dashboard-recommendations">
            <div className="dashboard-search-bar">
              <input
                type="text"
                className="dashboard-search-input"
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen((prev) => !prev)}
                aria-expanded={isFilterPanelOpen}
                aria-controls="dashboard-filters"
                aria-label="Show filters"
                className={`dashboard-filter-toggle ${isFilterPanelOpen ? "dashboard-filter-toggle--active" : ""}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="dashboard-filter-toggle__icon"
                >
                  <path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" />
                </svg>
              </button>
              {selectedPartyId &&
                (isSessionActive ? (
                  <button
                    className="dashboard-session-btn dashboard-session-btn--clear"
                    onClick={handleClearSession}
                  >
                    Clear Session
                  </button>
                ) : (
                  <button
                    className="dashboard-session-btn dashboard-session-btn--start"
                    onClick={handleStartSession}
                  >
                    Session
                  </button>
                ))}
            </div>
            {isSessionActive && (
              <p className="dashboard-session-active-msg">
                A session is currently active
              </p>
            )}
            {isFilterPanelOpen && (
              <div id="dashboard-filters" className="dashboard-filter-drawer">
                <FilterSidebar
                  maxDist={maxDist}
                  mode={travelMode}
                  cuisines={selectedCuisines}
                  priceLevels={selectedPriceLevels}
                  timeWindow={appliedTimeWindow}
                  onMaxDistChange={setMaxDist}
                  onModeChange={handleModeChange}
                  onCuisineToggle={handleCuisineToggle}
                  onPriceLevelToggle={handlePriceLevelToggle}
                  onTimeWindowChange={setAppliedTimeWindow}
                  onReset={handleResetFilters}
                  onClose={() => setIsFilterPanelOpen(false)}
                />
              </div>
            )}
            <div className="dashboard-results-layout">
              <div className="dashboard-results-panel">
                <div className="dash-picks-header">
                  <div className="dash-picks-header__top">
                    <h1 className="dashboard-recommendations__title">
                      {showVisited ? "Visited" : "Top Picks"}
                    </h1>
                    <div className="dash-view-toggle">
                      <button
                        className={`dash-view-toggle__btn${!showVisited ? " dash-view-toggle__btn--active" : ""}`}
                        onClick={() => setShowVisited(false)}
                      >
                        All
                      </button>
                      <button
                        className={`dash-view-toggle__btn${showVisited ? " dash-view-toggle__btn--active" : ""}`}
                        onClick={() => setShowVisited(true)}
                      >
                        Visited{" "}
                        {visitedIds.size > 0 && (
                          <span className="dash-view-toggle__count">
                            {visitedIds.size}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                  {selectedPartyId &&
                    !showVisited &&
                    (() => {
                      const partyName =
                        parties.find((p) => p.id === selectedPartyId)?.name ||
                        localStorage.getItem(SELECTED_PARTY_NAME_STORAGE_KEY);
                      return partyName ? (
                        <p className="dash-picks-subtitle">
                          {isSessionActive
                            ? `Showing results for: ${partyName}`
                            : `Based on party preferences for ${partyName}`}
                        </p>
                      ) : null;
                    })()}
                </div>
                {!selectedPartyId ? (
                  <p className="dashboard-recommendations__empty">
                    Choose a party to view recommendations.
                  </p>
                ) : isLoadingRecommendations ? (
                  <p className="dashboard-recommendations__empty">
                    Loading recommendations...
                  </p>
                ) : showVisited && visitedIds.size === 0 ? (
                  <p className="dashboard-recommendations__empty">
                    No visited restaurants yet.
                  </p>
                ) : recommendedRestaurants.length === 0 ? (
                  <p className="dashboard-recommendations__empty">
                    {appliedTimeWindow.start && appliedTimeWindow.end
                      ? "No restaurants are open during the selected time window."
                      : "No results for this party"}
                  </p>
                ) : (
                  <ul className="dashboard-recommendations__list">
                    {recommendedRestaurants
                      .map((item, originalIndex) => ({ item, originalIndex }))
                      .filter(({ item, originalIndex }) => {
                        const id =
                          item?.id ??
                          item?.restaurant_id ??
                          `${item?.restaurant_name}-${originalIndex}`;
                        if (showVisited && !visitedIds.has(id)) return false;
                        if (
                          searchQuery.trim() &&
                          !item?.restaurant_name
                            ?.toLowerCase()
                            .includes(searchQuery.toLowerCase())
                        )
                          return false;
                        return true;
                      })
                      .map(({ item, originalIndex: index }) => {
                        const label =
                          item?.restaurant_name || `Restaurant ${index + 1}`;
                        const rating = Number(
                          item?.rating ?? item?.avg_rating ?? 4.5,
                        );
                        const cost =
                          item?.cost ?? item?.price ?? item?.price_level ?? "";
                        const distanceValue =
                          item?.distance ?? item?.distance_miles;
                        const distanceNumber = Number(distanceValue);
                        const distance = Number.isFinite(distanceNumber)
                          ? `${distanceNumber.toFixed(1)} mi`
                          : typeof distanceValue === "string" &&
                              distanceValue.trim()
                            ? distanceValue
                            : "0.5 mi";
                        const cuisineLabels =
                          selectedCuisines.length > 0
                            ? getCuisineLabels(item)
                            : [];
                        const venueTags = getVenueTags(item);
                        const displayTags = [...cuisineLabels, ...venueTags];
                        const matchScoreValue = item?.match_score;
                        const matchScore = Number.isFinite(
                          Number(matchScoreValue),
                        )
                          ? Math.round(Number(matchScoreValue))
                          : 95;
                        const reasonsList = Array.isArray(item?.reasons)
                          ? item.reasons.slice(0, 3)
                          : [];

                        const itemId =
                          item?.id ??
                          item?.restaurant_id ??
                          `${label}-${index}`;
                        const isVisited = visitedIds.has(itemId);
                        const lat = item?.latitude ?? item?.lat;
                        const lng = item?.longitude ?? item?.lng ?? item?.lon;
                        // The navigate link is rendered entirely on the frontend.
                        // Testers can inspect this href in DevTools to verify the
                        // correct Google Maps destination is attached to each card.
                        const mapsUrl =
                          lat && lng
                            ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
                        const positiveReasons = reasonsList
                          .filter((r) => r.positive == true)
                          .map((r) => (typeof r === "string" ? r : r.reason));
                        const negativeReasons = reasonsList
                          .filter((r) => r.positive == false)
                          .map((r) => (typeof r === "string" ? r : r.reason));

                        if (showVisited) {
                          return (
                            <li
                              key={`${itemId}-${index}`}
                              className="dash-card dash-card--visited-view"
                              onClick={() =>
                                navigate("/finalized", {
                                  state: { restaurant: item, rank: index + 1 },
                                })
                              }
                            >
                              <div className="dash-card__body">
                                <div className="dash-card__left">
                                  <h2 className="dash-card__title">{label}</h2>
                                  <div className="dash-card__meta-row">
                                    <span className="dash-card__stars">
                                      {renderStars(rating)}
                                    </span>
                                    <span className="dash-card__rating-num">
                                      {rating.toFixed(1)}
                                    </span>
                                    <span className="dash-card__sep">·</span>
                                    <span className="dash-card__cost">
                                      {cost}
                                    </span>
                                    <span className="dash-card__sep">·</span>
                                    <span className="dash-card__distance">
                                      📍 {distance}
                                    </span>
                                  </div>
                                  {cuisineLabels.length > 0 && (
                                    <div className="card-cuisine-tags">
                                      {cuisineLabels.map((lbl, i) => (
                                        <span
                                          key={i}
                                          className={`card-cuisine-tag${isDietary(lbl) ? " card-cuisine-tag--dietary" : ""}`}
                                        >
                                          {isDietary(lbl) ? "🌱 " : ""}
                                          {lbl}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="dash-card__footer">
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="dash-card__navigate"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Navigate
                                </a>
                                <button
                                  className="dash-card__visited-btn dash-card__visited-btn--remove"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleVisited(itemId);
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </li>
                          );
                        }

                        return (
                          <li
                            key={`${itemId}-${index}`}
                            className={`dash-card${isVisited ? " dash-card--visited" : ""}`}
                            onClick={() =>
                              navigate("/finalized", {
                                state: { restaurant: item, rank: index + 1 },
                              })
                            }
                          >
                            <div className="dash-card__badges">
                              {index === 0 && (
                                <span className="dash-card__top-badge">
                                  Top Recommendation
                                </span>
                              )}
                              {isVisited && (
                                <span className="dash-card__visited-badge">
                                  Visited
                                </span>
                              )}
                            </div>
                            <div className="dash-card__body">
                              <div className="dash-card__left">
                                <h2 className="dash-card__title">
                                  <span className="dash-card__rank">
                                    #{index + 1}
                                  </span>{" "}
                                  {label}
                                </h2>
                                <div className="dash-card__meta-row">
                                  <span className="dash-card__stars">
                                    {renderStars(rating)}
                                  </span>
                                  <span className="dash-card__rating-num">
                                    {rating.toFixed(1)}
                                  </span>
                                  <span className="dash-card__sep">·</span>
                                  <span className="dash-card__cost">
                                    {cost}
                                  </span>
                                  <span className="dash-card__sep">·</span>
                                  <span className="dash-card__distance">
                                    📍 {distance}
                                  </span>
                                </div>
                                {displayTags.length > 0 && (
                                  <div className="card-cuisine-tags">
                                    {displayTags.map((lbl, i) => (
                                      <span
                                        key={i}
                                        className={`card-cuisine-tag${isDietary(lbl) ? " card-cuisine-tag--dietary" : ""}`}
                                      >
                                        {isDietary(lbl) ? "🌱 " : ""}
                                        {lbl}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {(positiveReasons.length > 0 ||
                                negativeReasons.length > 0) && (
                                <div className="dash-card__middle">
                                  <ul className="dash-card__reasons">
                                    {positiveReasons.map((r, i) => (
                                      <li
                                        key={`pos-${i}`}
                                        className="dash-card__reason dash-card__reason--good"
                                      >
                                        <span className="dash-card__reason-icon">
                                          ✓
                                        </span>{" "}
                                        {r}
                                      </li>
                                    ))}
                                    {negativeReasons.map((r, i) => (
                                      <li
                                        key={`neg-${i}`}
                                        className="dash-card__reason dash-card__reason--bad"
                                      >
                                        <span className="dash-card__reason-icon">
                                          ✗
                                        </span>{" "}
                                        {r}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <div className="dash-card__right">
                                <span className="dash-card__score">
                                  {matchScore} %
                                </span>
                                <span className="dash-card__score-label">
                                  Match Score
                                </span>
                              </div>
                            </div>
                            <div className="dash-card__footer">
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="dash-card__navigate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Navigate
                              </a>
                              <button
                                className={`dash-card__visited-btn${isVisited ? " dash-card__visited-btn--active" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isVisited) {
                                    handleToggleVisited(itemId);
                                    return;
                                  }
                                  openRatingModal(item, itemId);
                                }}
                              >
                                {isVisited ? "Visited ✓" : "Mark as Visited"}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <RatingModal
        isOpen={isRatingModalOpen}
        restaurantName={
          selectedPlaceForRating?.name ||
          selectedPlaceForRating?.restaurant_name ||
          "this restaurant"
        }
        rating={selectedStarRating}
        onRatingChange={setSelectedStarRating}
        onCancel={closeRatingModal}
        onSubmit={handleSubmitVisitedWithRating}
        isSubmitting={isSubmittingRating}
        error={ratingModalError}
      />
    </div>
  );
}
