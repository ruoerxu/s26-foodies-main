import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { buildApiUrl } from "../lib/apiBase";
import { deleteParty } from "../lib/partyApi";
import MembersPanel from "../components/MembersPanel";
import PartyProfilePanel from "../components/PartyProfilePanel";
import NotificationsPanel from "../components/NotificationsPanel";

const SELECTED_PARTY_ID_STORAGE_KEY = "selectedPartyId";
const SELECTED_PARTY_NAME_STORAGE_KEY = "selectedPartyName";
const SELECTED_PARTY_IMAGE_STORAGE_KEY = "selectedPartyImageUrl";

function ArrowIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
    >
      <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UtensilsIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
    </svg>
  );
}

function MembersIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 15.75V14.25C12 13.4544 11.684 12.6913 11.121 12.1287C10.559 11.566 9.796 11.25 9 11.25H4.5C3.704 11.25 2.941 11.566 2.379 12.1287C1.816 12.6913 1.5 13.4544 1.5 14.25V15.75" />
      <path d="M12 2.346C12.643 2.513 13.213 2.888 13.62 3.414C14.027 3.94 14.247 4.585 14.247 5.25C14.247 5.915 14.027 6.56 13.62 7.086C13.213 7.612 12.643 7.987 12 8.154" />
      <path d="M16.5 15.75V14.25C16.5 13.585 16.278 12.94 15.871 12.414C15.464 11.889 14.894 11.514 14.25 11.348" />
      <path d="M6.75 8.25C8.407 8.25 9.75 6.907 9.75 5.25C9.75 3.593 8.407 2.25 6.75 2.25C5.093 2.25 3.75 3.593 3.75 5.25C3.75 6.907 5.093 8.25 6.75 8.25Z" />
    </svg>
  );
}

function TrashIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function CloseIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden
    >
      <path d="M7 7l10 10M17 7L7 17" strokeLinecap="round" />
    </svg>
  );
}

function shortenPartyName(name, startLength = 11, endLength = 3) {
  if (name.length <= startLength + endLength + 5) {
    return name;
  }

  return `${name.slice(0, startLength)} ... ${name.slice(-endLength)}`;
}

export default function PartySettingsPage() {
  const navigate = useNavigate();
  const [selectedPartyId, setSelectedPartyId] = useState(
    () => sessionStorage.getItem(SELECTED_PARTY_ID_STORAGE_KEY) || "",
  );
  const [selectedPartyName, setSelectedPartyName] = useState(
    () => localStorage.getItem(SELECTED_PARTY_NAME_STORAGE_KEY) || "",
  );
  const [selectedPartyImageUrl, setSelectedPartyImageUrl] = useState(
    () => localStorage.getItem(SELECTED_PARTY_IMAGE_STORAGE_KEY) || "",
  );
  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleLogout() {
    try {
      await fetch(buildApiUrl("/src/logout.php"), {
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

  useEffect(() => {
    function syncSelectedParty() {
      setSelectedPartyId(
        sessionStorage.getItem(SELECTED_PARTY_ID_STORAGE_KEY) || "",
      );
      setSelectedPartyName(
        localStorage.getItem(SELECTED_PARTY_NAME_STORAGE_KEY) || "",
      );
      setSelectedPartyImageUrl(
        localStorage.getItem(SELECTED_PARTY_IMAGE_STORAGE_KEY) || "",
      );
    }

    syncSelectedParty();
    window.addEventListener("storage", syncSelectedParty);

    return () => {
      window.removeEventListener("storage", syncSelectedParty);
    };
  }, []);

  useEffect(() => {
    setShowDeletePanel(false);
    setShowMembersPanel(false);
    setShowProfilePanel(false);
    setShowNotificationsPanel(false);
    setConfirmName("");
    setDeleteError("");
    setIsDeleting(false);
  }, [selectedPartyId]);

  const hasSelectedParty = Boolean(selectedPartyId);
  const normalizedPartyName = (selectedPartyName || "").trim();
  const normalizedConfirmName = confirmName.trim();
  const displayPartyName = shortenPartyName(
    normalizedPartyName || "Selected Party",
  );
  const showNameMismatch =
    showDeletePanel &&
    normalizedConfirmName.length > 0 &&
    normalizedPartyName.length > 0 &&
    normalizedConfirmName !== normalizedPartyName;

  async function handleConfirmDelete() {
    if (!normalizedPartyName || normalizedConfirmName !== normalizedPartyName) {
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      await deleteParty(selectedPartyId, normalizedPartyName);
      sessionStorage.removeItem(SELECTED_PARTY_ID_STORAGE_KEY);
      localStorage.removeItem(SELECTED_PARTY_NAME_STORAGE_KEY);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setDeleteError(error.message || "Failed to delete party");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="party-settings-page">
      <NavBar onLogout={handleLogout} />

      <main className="party-settings-main">
        {hasSelectedParty ? (
          <div
            className={`party-settings-layout${showDeletePanel || showMembersPanel || showProfilePanel || showNotificationsPanel ? " party-settings-layout--expanded" : ""}`}
          >
            <section
              className="party-settings-card"
              aria-label="Party settings"
            >
              <button
                type="button"
                className={`party-settings-item party-settings-item--button${showProfilePanel ? " party-settings-item--active" : ""}`}
                onClick={() => {
                  setShowDeletePanel(false);
                  setShowMembersPanel(false);
                  setShowNotificationsPanel(false);
                  setShowProfilePanel(true);
                }}
              >
                <UtensilsIcon className="party-settings-item__icon" />

                <span className="party-settings-item__text">
                  <span className="party-settings-item__label">
                    Party Profile
                  </span>
                  <span className="party-settings-item__desc">
                    View and edit party name and picture
                  </span>
                </span>

                <ArrowIcon className="party-settings-item__arrow" />
              </button>
              <button
                type="button"
                className={`party-settings-item party-settings-item--button${showMembersPanel ? " party-settings-item--active" : ""}`}
                onClick={() => {
                  setShowDeletePanel(false);
                  setShowProfilePanel(false);
                  setShowNotificationsPanel(false);
                  setShowMembersPanel(true);
                }}
              >
                <MembersIcon className="party-settings-item__icon" />

                <span className="party-settings-item__text">
                  <span className="party-settings-item__label">
                    Manage Members
                  </span>
                  <span className="party-settings-item__desc">
                    Add or remove party members
                  </span>
                </span>

                <ArrowIcon className="party-settings-item__arrow" />
              </button>
              <button
                type="button"
                className={`party-settings-item party-settings-item--button${showNotificationsPanel ? " party-settings-item--active" : ""}`}
                onClick={() => {
                  setShowDeletePanel(false);
                  setShowMembersPanel(false);
                  setShowProfilePanel(false);
                  setShowNotificationsPanel(true);
                }}
              >
                <BellIcon className="party-settings-item__icon" />
                <span className="party-settings-item__text">
                  <span className="party-settings-item__label">Notifications</span>
                  <span className="party-settings-item__desc">Manage party notifications.</span>
                </span>
                <ArrowIcon className="party-settings-item__arrow" />
              </button>
              <button
                type="button"
                className={`party-settings-item party-settings-item--button${showDeletePanel ? " party-settings-item--active" : ""}`}
                onClick={() => {
                  setShowMembersPanel(false);
                  setShowProfilePanel(false);
                  setShowNotificationsPanel(false);
                  setShowDeletePanel(true);
                }}
              >
                <TrashIcon className="party-settings-item__icon" />

                <span className="party-settings-item__text">
                  <span className="party-settings-item__label">
                    Delete Party
                  </span>
                  <span className="party-settings-item__desc">
                    Permanently delete this party
                  </span>
                </span>

                <ArrowIcon className="party-settings-item__arrow" />
              </button>
            </section>

            {showDeletePanel && (
              <section
                className="party-settings-delete-card"
                aria-label="Delete party confirmation"
              >
                <h2 className="party-settings-delete-card__title">
                  Delete &quot;{displayPartyName}&quot;
                </h2>
                <p className="party-settings-delete-card__text">
                  Are you sure you want to delete &quot;{displayPartyName}
                  &quot;? This action cannot be undone.
                </p>

                <label
                  className="party-settings-delete-card__label"
                  htmlFor="party-delete-confirm-name"
                >
                  Enter party name
                </label>

                <div className="party-settings-confirm-input-wrap">
                  <input
                    id="party-delete-confirm-name"
                    type="text"
                    className={`party-settings-confirm-input${showNameMismatch ? " party-settings-confirm-input--error" : ""}`}
                    value={confirmName}
                    onChange={(event) => setConfirmName(event.target.value)}
                  />

                  {confirmName && (
                    <button
                      type="button"
                      className="party-settings-confirm-clear"
                      aria-label="Clear party name"
                      onClick={() => setConfirmName("")}
                    >
                      <CloseIcon className="party-settings-confirm-clear__icon" />
                    </button>
                  )}
                </div>

                {showNameMismatch && (
                  <p className="party-settings-confirm-error">
                    Party name does not match.
                  </p>
                )}

                <div className="party-settings-delete-card__actions">
                  <button
                    type="button"
                    className="party-settings-delete-card__btn party-settings-delete-card__btn--ghost"
                    onClick={() => {
                      setShowDeletePanel(false);
                      setConfirmName("");
                      setDeleteError("");
                    }}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="party-settings-delete-card__btn party-settings-delete-card__btn--danger"
                    onClick={handleConfirmDelete}
                    disabled={
                      !normalizedPartyName ||
                      normalizedConfirmName !== normalizedPartyName ||
                      isDeleting
                    }
                  >
                    {isDeleting ? "Deleting..." : "Confirm"}
                  </button>
                </div>

                {deleteError && (
                  <p className="party-settings-confirm-error">{deleteError}</p>
                )}
              </section>
            )}
            {showProfilePanel && (
              <PartyProfilePanel partyId={selectedPartyId} existingImageUrl={selectedPartyImageUrl} />
            )}
            {showNotificationsPanel && (
              <NotificationsPanel partyId={selectedPartyId} />
            )}
            {showMembersPanel && (
              <MembersPanel
                displayPartyName={displayPartyName}
                partyId={selectedPartyId}
              />
            )}
          </div>
        ) : (
          <section
            className="party-settings-card party-settings-card--empty"
            aria-label="Party settings"
          >
            <div className="party-settings-empty">
              <p className="party-settings-card__eyebrow">Party Settings</p>
              <h1 className="party-settings-card__title">No party selected</h1>
              <p className="party-settings-empty__text">
                Choose a party from the dashboard to view its settings.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
