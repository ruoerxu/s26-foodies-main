import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import NavBar from "../components/NavBar";
import { buildApiUrl } from "../lib/apiBase";

const DIETARY_STORAGE_KEY = "profileDietaryRestrictions";
const USERNAME_STORAGE_KEY = "profileUsername";
const CUISINES_STORAGE_KEY = "profileDislikedCuisines";
const LOCATION_STORAGE_KEY = "profileLocation";
const NOTIFICATIONS_STORAGE_KEY = "profileNotifications";

const DIETARY_OPTIONS = [
  "Alcohol-Free",
  "Halal",
  "Kosher",
  "Vegan",
  "Vegetarian",
  "Pescatarian",
  "Seafood Allergy",
];

const CUISINE_OPTIONS = [
  "American",
  "Barbecue",
  "British",
  "Chinese",
  "French",
  "Greek",
  "Indian",
  "Italian",
  "Japanese",
  "Korean",
  "Latin American",
  "Mediterranean",
  "Mexican",
  "Thai",
  "Vietnamese",
];

const MAX_DISLIKED_CUISINES = 30;
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]+$/;

function ForkKnifeIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M8 2v20M8 2c0 2.2 1.8 4 4 4s4-1.8 4-4V2" />
      <path d="M4 10v12M20 10v12M4 10h4v12H4zM16 10h4v12h-4z" />
    </svg>
  );
}

function ChefHatIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M6 20v-6a6 6 0 0112 0v6M4 20h16" />
      <path d="M12 4c-2 0-3.5 1.5-4 4h8c-.5-2.5-2-4-4-4z" />
    </svg>
  );
}

function MapPinIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function AccountIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BellIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function ChevronIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function EnvelopeIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 6L12 13 2 6" />
    </svg>
  );
}

function PhoneIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function LockIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function BowlIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M18 8c0 3.31-2.69 6-6 6s-6-2.69-6-6" />
      <path d="M4 14h16v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4z" />
    </svg>
  );
}

function XIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

const SIDEBAR_ITEMS = [
  {
    to: "/profile/settings/username",
    label: "Change Username",
    desc: "",
    Icon: AccountIcon,
  },
  {
    to: "/profile/settings",
    label: "Dietary Restrictions",
    desc: "Select your Dietary Restrictions",
    Icon: ForkKnifeIcon,
  },
  {
    to: "/profile/settings/cuisines",
    label: "Disliked Cuisines",
    desc: "Select up to 30 Cuisines you might not like",
    Icon: ChefHatIcon,
  },
  {
    to: "/profile/settings/location",
    label: "Location",
    desc: "Change your location, so we can find the best restaurants around you.",
    Icon: MapPinIcon,
  },
  {
    to: "/profile/settings/account",
    label: "Your Account",
    desc: "Change password, update contact info, etc.",
    Icon: AccountIcon,
  },
  {
    to: "/profile/settings/notifications",
    label: "Notifications",
    desc: "Select on or off for notifications you receive from us",
    Icon: BellIcon,
  },
];

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return fallback;
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export default function ProfileSettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname || "";

  const [usernameValue, setUsernameValue] = useState(
    () => localStorage.getItem(USERNAME_STORAGE_KEY) || "partyfoodies",
  );
  const [dietarySelected, setDietarySelected] = useState(() =>
    loadJson(DIETARY_STORAGE_KEY, []),
  );
  const [dislikedCuisines, setDislikedCuisines] = useState(() =>
    loadJson(CUISINES_STORAGE_KEY, []),
  );
  const [locationValue, setLocationValue] = useState(
    () => localStorage.getItem(LOCATION_STORAGE_KEY) || "",
  );
  const [locationLat, setLocationLat] = useState(null);
  const [locationLng, setLocationLng] = useState(null);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const autocompleteTimerRef = useRef(null);
  const [notifications, setNotifications] = useState(() =>
    loadJson(NOTIFICATIONS_STORAGE_KEY, {
      partyInvitations: true,
      newRestaurants: true,
      friendRequests: true,
    }),
  );
  const [savedMessage, setSavedMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [accountEmailInput, setAccountEmailInput] = useState("");
  const [accountPhoneInput, setAccountPhoneInput] = useState("");
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  useEffect(() => {
    setUsernameValue(
      localStorage.getItem(USERNAME_STORAGE_KEY) || "partyfoodies",
    );
    setDislikedCuisines(loadJson(CUISINES_STORAGE_KEY, []));
    setLocationValue(localStorage.getItem(LOCATION_STORAGE_KEY) || "");
    setNotifications(
      loadJson(NOTIFICATIONS_STORAGE_KEY, {
        partyInvitations: true,
        newRestaurants: true,
        friendRequests: true,
      }),
    );

    async function loadProfile() {
      try {
        const res = await fetch(getProfileUrl(), { credentials: "include" });
        const data = await res.json();
        if (data.success && data.profile) {
          if (typeof data.profile.username === "string" && data.profile.username) {
            setUsernameValue(data.profile.username);
            localStorage.setItem(USERNAME_STORAGE_KEY, data.profile.username);
          }
          if (Array.isArray(data.profile.dietary_restrictions)) {
            setDietarySelected(data.profile.dietary_restrictions);
            saveJson(DIETARY_STORAGE_KEY, data.profile.dietary_restrictions);
          } else {
            setDietarySelected(loadJson(DIETARY_STORAGE_KEY, []));
          }
          if (Array.isArray(data.profile.disliked_cuisines)) {
            setDislikedCuisines(data.profile.disliked_cuisines);
            saveJson(CUISINES_STORAGE_KEY, data.profile.disliked_cuisines);
          } else {
            setDislikedCuisines(loadJson(CUISINES_STORAGE_KEY, []));
          }
          setProfileEmail(data.profile.email ?? "");
          setProfilePhone(data.profile.phone ?? "");
          setAccountEmailInput(data.profile.email ?? "");
          setAccountPhoneInput(data.profile.phone ?? "");
          if (data.profile.city) {
            setLocationValue(data.profile.city);
            localStorage.setItem(LOCATION_STORAGE_KEY, data.profile.city);
          }
          if (data.profile.lat != null) setLocationLat(data.profile.lat);
          if (data.profile.lng != null) setLocationLng(data.profile.lng);
        } else {
          setDietarySelected(loadJson(DIETARY_STORAGE_KEY, []));
        }
      } catch {
        setDietarySelected(loadJson(DIETARY_STORAGE_KEY, []));
      }
    }
    loadProfile();
  }, []);

  function getLogoutUrl() {
    return buildApiUrl("/src/logout.php");
  }

  function getProfileUrl() {
    return buildApiUrl("/src/profile.php");
  }

  function getChangePasswordUrl() {
    return buildApiUrl("/src/change_password.php");
  }

  async function handleLogout() {
    try {
      await fetch(getLogoutUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } catch {
      // continue
    } finally {
      localStorage.removeItem("isLoggedIn");
      navigate("/login", { replace: true });
    }
  }

  function showSaved() {
    setSavedMessage("Profile saved");
    setTimeout(() => setSavedMessage(""), 3000);
  }

  function toggleDietary(option) {
    setDietarySelected((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option],
    );
  }

  async function saveDietary() {
    setSaving(true);
    try {
      const res = await fetch(getProfileUrl(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dietary_restrictions: dietarySelected }),
      });
      const data = await res.json();
      if (data.success) {
        saveJson(DIETARY_STORAGE_KEY, dietarySelected);
        showSaved();
      } else {
        setSavedMessage(data.message || "Failed to save");
        setTimeout(() => setSavedMessage(""), 3000);
      }
    } catch {
      setSavedMessage("Failed to save");
      setTimeout(() => setSavedMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  function toggleCuisine(cuisine) {
    setDislikedCuisines((prev) => {
      if (prev.includes(cuisine)) return prev.filter((c) => c !== cuisine);
      if (prev.length >= MAX_DISLIKED_CUISINES) return prev;
      return [...prev, cuisine];
    });
  }

  function removeDislikedCuisine(cuisine) {
    setDislikedCuisines((prev) => prev.filter((c) => c !== cuisine));
  }

  async function saveCuisines() {
    setSaving(true);
    try {
      const res = await fetch(getProfileUrl(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ disliked_cuisines: dislikedCuisines }),
      });
      const data = await res.json();
      if (data.success) {
        saveJson(CUISINES_STORAGE_KEY, dislikedCuisines);
        showSaved();
      } else {
        setSavedMessage(data.message || "Failed to save");
        setTimeout(() => setSavedMessage(""), 3000);
      }
    } catch {
      setSavedMessage("Failed to save");
      setTimeout(() => setSavedMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function saveLocation() {
    setSaving(true);
    setLocationError("");
    try {
      const res = await fetch(getProfileUrl(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          city: locationValue,
          lat: locationLat,
          lng: locationLng,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        localStorage.setItem(LOCATION_STORAGE_KEY, locationValue);
        showSaved();
      } else {
        setLocationError(data.message || `Save failed (${res.status})`);
      }
    } catch {
      setLocationError("Save failed: network error");
    } finally {
      setSaving(false);
    }
  }

  function getSuggestionLabel(result) {
    const a = result.address || {};
    const city =
      a.city || a.town || a.village || a.municipality || result.display_name;
    const state = a.state || "";
    const country = a.country || "";
    return [city, state, country].filter(Boolean).join(", ");
  }

  function handleCityInputChange(e) {
    const value = e.target.value;
    setLocationValue(value);
    setLocationLat(null);
    setLocationLng(null);
    setLocationError("");
    if (autocompleteTimerRef.current)
      clearTimeout(autocompleteTimerRef.current);
    if (value.trim().length < 2) {
      setCitySuggestions([]);
      setShowSuggestions(false);
      return;
    }
    autocompleteTimerRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&featuretype=city&addressdetails=1&limit=5&format=json`;
        const res = await fetch(url, { headers: { "Accept-Language": "en" } });
        const results = await res.json();
        const filtered = results.filter(
          (r) =>
            r.address &&
            (r.address.city ||
              r.address.town ||
              r.address.village ||
              r.address.municipality),
        );
        setCitySuggestions(filtered.slice(0, 5));
        setShowSuggestions(filtered.length > 0);
      } catch {
        setCitySuggestions([]);
        setShowSuggestions(false);
      }
    }, 400);
  }

  function handleSuggestionClick(result) {
    setLocationValue(getSuggestionLabel(result));
    setLocationLat(parseFloat(result.lat));
    setLocationLng(parseFloat(result.lon));
    setCitySuggestions([]);
    setShowSuggestions(false);
  }

  function handleFindMyLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }
    setGeoLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
          const res = await fetch(url, {
            headers: { "Accept-Language": "en" },
          });
          const data = await res.json();
          if (data && data.address) {
            const a = data.address;
            const city = a.city || a.town || a.village || a.municipality || "";
            const label = [city, a.state, a.country].filter(Boolean).join(", ");
            setLocationValue(label);
            setLocationLat(latitude);
            setLocationLng(longitude);
            setCitySuggestions([]);
            setShowSuggestions(false);
          } else {
            setLocationError(
              "Could not resolve city name. You can type a city manually.",
            );
          }
        } catch {
          setLocationError(
            "Failed to look up city name. Check your connection.",
          );
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        const msgs = {
          [err.PERMISSION_DENIED]:
            "Location permission denied. Allow location access in your browser.",
          [err.POSITION_UNAVAILABLE]: "Location information is unavailable.",
          [err.TIMEOUT]: "Location request timed out.",
        };
        setLocationError(
          msgs[err.code] || "Unknown error getting your location.",
        );
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }

  async function saveAccountEmail() {
    setSaving(true);
    setSavedMessage("");
    try {
      const res = await fetch(getProfileUrl(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: accountEmailInput }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setProfileEmail(accountEmailInput);
        showSaved();
      } else {
        setSavedMessage(data.message || `Save failed (${res.status})`);
        setTimeout(() => setSavedMessage(""), 5000);
      }
    } catch (e) {
      setSavedMessage("Save failed: request error");
      setTimeout(() => setSavedMessage(""), 5000);
    } finally {
      setSaving(false);
    }
  }

  async function saveAccountPhone() {
    setSaving(true);
    try {
      const res = await fetch(getProfileUrl(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: accountPhoneInput }),
      });
      const data = await res.json();
      if (data.success) {
        setProfilePhone(accountPhoneInput);
        showSaved();
      } else {
        setSavedMessage(data.message || "Failed to save");
        setTimeout(() => setSavedMessage(""), 3000);
      }
    } catch {
      setSavedMessage("Failed to save");
      setTimeout(() => setSavedMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function saveAccountPassword() {
    if (passwordNew !== passwordConfirm) {
      setSavedMessage("New passwords do not match");
      setTimeout(() => setSavedMessage(""), 3000);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(getChangePasswordUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          current_password: passwordCurrent,
          new_password: passwordNew,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedMessage("Password updated");
        setPasswordCurrent("");
        setPasswordNew("");
        setPasswordConfirm("");
        setTimeout(() => setSavedMessage(""), 3000);
      } else {
        setSavedMessage(data.message || "Failed to update password");
        setTimeout(() => setSavedMessage(""), 3000);
      }
    } catch {
      setSavedMessage("Failed to update password");
      setTimeout(() => setSavedMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function saveUsername() {
    const trimmedUsername = usernameValue.trim();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      setSavedMessage("Username must be between 3 and 30 characters");
      setTimeout(() => setSavedMessage(""), 3000);
      return;
    }

    if (!USERNAME_REGEX.test(trimmedUsername)) {
      setSavedMessage(
        "Username can only use letters, numbers, underscores, periods, and hyphens",
      );
      setTimeout(() => setSavedMessage(""), 3000);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(getProfileUrl(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: trimmedUsername }),
      });
      const data = await res.json();
      if (data.success) {
        setUsernameValue(trimmedUsername);
        localStorage.setItem(USERNAME_STORAGE_KEY, trimmedUsername);
        showSaved();
      } else {
        setSavedMessage(data.message || "Failed to update username");
        setTimeout(() => setSavedMessage(""), 3000);
      }
    } catch {
      setSavedMessage("Failed to update username");
      setTimeout(() => setSavedMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  function setNotification(key, value) {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  }

  function saveNotifications() {
    setSaving(true);
    saveJson(NOTIFICATIONS_STORAGE_KEY, notifications);
    setSaving(false);
    showSaved();
  }

  const isDietary =
    pathname === "/profile/settings" || pathname === "/profile/settings/";
  const isUsername =
    pathname === "/profile/settings/username" ||
    pathname === "/profile/settings/name";
  const isCuisines = pathname === "/profile/settings/cuisines";
  const isLocation = pathname === "/profile/settings/location";
  const isAccount = pathname === "/profile/settings/account";
  const isNotifications = pathname === "/profile/settings/notifications";

  function renderContent() {
    if (isUsername) {
      return (
        <>
          <h2 className="profile-settings-content-title">Change Username</h2>
          <input
            type="text"
            className="profile-settings-location-input"
            placeholder="Enter your new username"
            value={usernameValue}
            onChange={(e) => setUsernameValue(e.target.value)}
            aria-label="New username"
          />
          {savedMessage && (
            <p className="profile-settings-saved-msg" role="status">
              {savedMessage}
            </p>
          )}
          <button
            type="button"
            className="profile-settings-save-btn"
            onClick={saveUsername}
            disabled={saving}
          >
            Save
          </button>
        </>
      );
    }

    if (isCuisines) {
      return (
        <>
          <h2 className="profile-settings-content-title">
            Your Disliked Cuisines
          </h2>
          <p className="profile-settings-content-desc">
            Select up to {MAX_DISLIKED_CUISINES} cuisines you might not like.
          </p>
          <ul className="profile-cuisines-list">
            {CUISINE_OPTIONS.map((cuisine) => (
              <li key={cuisine} className="profile-cuisines-item">
                <span className="profile-cuisines-name">{cuisine}</span>
                {dislikedCuisines.includes(cuisine) ? (
                  <button
                    type="button"
                    className="profile-cuisines-remove"
                    onClick={() => removeDislikedCuisine(cuisine)}
                    aria-label={`Remove ${cuisine} from disliked`}
                  >
                    <XIcon className="profile-cuisines-x" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="profile-cuisines-add"
                    onClick={() => toggleCuisine(cuisine)}
                    disabled={dislikedCuisines.length >= MAX_DISLIKED_CUISINES}
                    aria-label={`Mark ${cuisine} as disliked`}
                  >
                    Add
                  </button>
                )}
              </li>
            ))}
          </ul>
          {savedMessage && (
            <p className="profile-settings-saved-msg" role="status">
              {savedMessage}
            </p>
          )}
          <button
            type="button"
            className="profile-settings-save-btn"
            onClick={saveCuisines}
            disabled={saving}
          >
            Save
          </button>
        </>
      );
    }

    if (isLocation) {
      return (
        <>
          <h2 className="profile-settings-content-title">Location</h2>
          <p className="profile-settings-content-desc">
            Set your home city so we can find the best restaurants around you.
          </p>

          <div className="profile-location-input-wrap">
            <input
              type="text"
              className="profile-settings-location-input"
              placeholder="Search your home city"
              value={locationValue}
              onChange={handleCityInputChange}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => {
                if (citySuggestions.length > 0) setShowSuggestions(true);
              }}
              aria-label="Home city"
              aria-autocomplete="list"
              aria-expanded={showSuggestions}
              autoComplete="off"
            />
            {showSuggestions && citySuggestions.length > 0 && (
              <ul className="profile-location-suggestions" role="listbox">
                {citySuggestions.map((result) => (
                  <li
                    key={result.place_id}
                    className="profile-location-suggestion-item"
                    role="option"
                    onMouseDown={() => handleSuggestionClick(result)}
                  >
                    {getSuggestionLabel(result)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            className="profile-location-geo-btn"
            onClick={handleFindMyLocation}
            disabled={geoLoading || saving}
          >
            {geoLoading ? "Detecting location..." : "Find My Location"}
          </button>

          <button
            type="button"
            className="profile-location-save-btn"
            onClick={saveLocation}
            disabled={saving || geoLoading}
          >
            {saving ? "Saving..." : "Save"}
          </button>

          {locationError && (
            <p className="profile-location-error" role="alert">
              {locationError}
            </p>
          )}
          {savedMessage && (
            <p className="profile-settings-saved-msg" role="status">
              {savedMessage}
            </p>
          )}
        </>
      );
    }

    if (isAccount) {
      return (
        <>
          <h2 className="profile-settings-content-title">Your Account</h2>
          <div className="profile-account-list">
            <div className="profile-account-block">
              <EnvelopeIcon className="profile-account-icon" />
              <div className="profile-account-text">
                <span className="profile-account-label">Change Email</span>
                <span className="profile-account-value">
                  {profileEmail || "Not set"}
                </span>
              </div>
              <input
                type="email"
                className="profile-settings-location-input profile-account-input"
                placeholder="Enter new email"
                value={accountEmailInput}
                onChange={(e) => setAccountEmailInput(e.target.value)}
                aria-label="New email"
              />
              <button
                type="button"
                className="profile-settings-save-btn"
                onClick={saveAccountEmail}
                disabled={saving}
              >
                Save
              </button>
            </div>
            <div className="profile-account-block">
              <PhoneIcon className="profile-account-icon" />
              <div className="profile-account-text">
                <span className="profile-account-label">
                  Change Phone Number
                </span>
                <span className="profile-account-value">
                  {profilePhone || "Not set"}
                </span>
              </div>
              <input
                type="tel"
                className="profile-settings-location-input profile-account-input"
                placeholder="Enter new phone number"
                value={accountPhoneInput}
                onChange={(e) => setAccountPhoneInput(e.target.value)}
                aria-label="New phone"
              />
              <button
                type="button"
                className="profile-settings-save-btn"
                onClick={saveAccountPhone}
                disabled={saving}
              >
                Save
              </button>
            </div>
            <div className="profile-account-block">
              <LockIcon className="profile-account-icon" />
              <div className="profile-account-text">
                <span className="profile-account-label">Change Password</span>
              </div>
              <input
                type="password"
                className="profile-settings-location-input profile-account-input"
                placeholder="Current password"
                value={passwordCurrent}
                onChange={(e) => setPasswordCurrent(e.target.value)}
                aria-label="Current password"
              />
              <input
                type="password"
                className="profile-settings-location-input profile-account-input"
                placeholder="New password (8+ chars, include a number)"
                value={passwordNew}
                onChange={(e) => setPasswordNew(e.target.value)}
                aria-label="New password"
              />
              <input
                type="password"
                className="profile-settings-location-input profile-account-input"
                placeholder="Confirm new password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                aria-label="Confirm new password"
              />
              <button
                type="button"
                className="profile-settings-save-btn"
                onClick={saveAccountPassword}
                disabled={saving}
              >
                Save
              </button>
            </div>
          </div>
          {savedMessage && (
            <p className="profile-settings-saved-msg" role="status">
              {savedMessage}
            </p>
          )}
        </>
      );
    }

    if (isNotifications) {
      return (
        <>
          <h2 className="profile-settings-content-title">Notifications</h2>
          <div className="profile-notifications-list">
            <div className="profile-notifications-row">
              <EnvelopeIcon className="profile-notifications-icon" />
              <span className="profile-notifications-label">
                Party Invitations
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={notifications.partyInvitations}
                className={`profile-settings-toggle ${notifications.partyInvitations ? "profile-settings-toggle--on" : ""}`}
                onClick={() =>
                  setNotification(
                    "partyInvitations",
                    !notifications.partyInvitations,
                  )
                }
              />
            </div>
            <div className="profile-notifications-row">
              <BowlIcon className="profile-notifications-icon" />
              <span className="profile-notifications-label">
                New Restaurants
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={notifications.newRestaurants}
                className={`profile-settings-toggle ${notifications.newRestaurants ? "profile-settings-toggle--on" : ""}`}
                onClick={() =>
                  setNotification(
                    "newRestaurants",
                    !notifications.newRestaurants,
                  )
                }
              />
            </div>
            <div className="profile-notifications-row">
              <AccountIcon className="profile-notifications-icon" />
              <span className="profile-notifications-label">
                Friend Requests
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={notifications.friendRequests}
                className={`profile-settings-toggle ${notifications.friendRequests ? "profile-settings-toggle--on" : ""}`}
                onClick={() =>
                  setNotification(
                    "friendRequests",
                    !notifications.friendRequests,
                  )
                }
              />
            </div>
          </div>
          {savedMessage && (
            <p className="profile-settings-saved-msg" role="status">
              {savedMessage}
            </p>
          )}
          <button
            type="button"
            className="profile-settings-save-btn"
            onClick={saveNotifications}
            disabled={saving}
          >
            Save
          </button>
        </>
      );
    }

    // Dietary Restrictions (default)
    return (
      <>
        <h2 className="profile-settings-content-title">
          Your Dietary Restrictions
        </h2>
        <ul className="profile-dietary-list">
          {DIETARY_OPTIONS.map((option) => (
            <li key={option} className="profile-dietary-item">
              <label className="profile-dietary-label">
                <input
                  type="checkbox"
                  checked={dietarySelected.includes(option)}
                  onChange={() => toggleDietary(option)}
                  className="profile-dietary-checkbox"
                />
                <span className="profile-dietary-name">{option}</span>
              </label>
            </li>
          ))}
        </ul>
        {savedMessage && (
          <p className="profile-settings-saved-msg" role="status">
            {savedMessage}
          </p>
        )}
        <button
          type="button"
          className="profile-settings-save-btn"
          onClick={saveDietary}
          disabled={saving}
        >
          Save
        </button>
      </>
    );
  }

  return (
    <div className="profile-settings-page">
      <NavBar onLogout={handleLogout} />
      <main className="profile-settings-main">
        <aside className="profile-settings-sidebar">
          <nav className="profile-settings-nav" aria-label="Profile settings">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive =
                item.to === "/profile/settings"
                  ? isDietary
                  : pathname === item.to;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`profile-settings-nav-item ${isActive ? "profile-settings-nav-item--active" : ""}`}
                >
                  <item.Icon className="profile-settings-nav-icon" />
                  <div className="profile-settings-nav-text">
                    <span className="profile-settings-nav-label">
                      {item.label}
                    </span>
                    {item.desc ? (
                      <span className="profile-settings-nav-desc">
                        {item.desc}
                      </span>
                    ) : null}
                  </div>
                  <ChevronIcon className="profile-settings-nav-chevron" />
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            className="profile-settings-logout"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </aside>
        <div className="profile-settings-content">{renderContent()}</div>
      </main>
    </div>
  );
}
