import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateParty } from "../lib/partyApi";

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ width: "1rem", height: "1rem" }}
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
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

export default function PartyProfilePanel({ partyId, existingImageUrl = "" }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(
    () => localStorage.getItem("selectedPartyName") ?? "",
  );
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setError("");
    }
    // Reset input so the same file can be re-selected
    event.target.value = "";
  }

  async function handleSave() {
    if (name.trim().length > 15) {
      setError("Group name cannot be greater than 15 characters");
      return;
    }
    if (imageFile && imageFile.size > 5 * 1024 * 1024) {
      setError("Group picture cannot be larger than 5mb");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const data = await updateParty(partyId, name.trim(), imageFile);
      localStorage.setItem("selectedPartyName", data.party.name);
      localStorage.setItem("selectedPartyImageUrl", data.party.image_url ?? "");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const displaySrc = previewUrl || existingImageUrl || null;

  return (
    <section className="party-profile-panel" aria-label="Party profile">
      <div className="party-profile-panel__avatar-wrap">
        <label
          className="party-profile-panel__avatar-label"
          htmlFor="party-profile-image-upload"
          aria-label="Change party picture"
        >
          {displaySrc ? (
            <img
              src={displaySrc}
              alt="Party"
              className="party-profile-panel__avatar"
            />
          ) : (
            <div className="party-profile-panel__avatar party-profile-panel__avatar--placeholder" />
          )}
          <span className="party-profile-panel__camera-badge">
            <CameraIcon />
          </span>
        </label>
        <input
          id="party-profile-image-upload"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="party-profile-panel__upload-input"
          onChange={handleFileChange}
        />
      </div>

      <label
        className="party-profile-panel__label"
        htmlFor="party-profile-name"
      >
        Party Name
      </label>
      <div className="party-profile-panel__input-wrap">
        <input
          id="party-profile-name"
          type="text"
          className="party-profile-panel__input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
        />
        {name && (
          <button
            type="button"
            className="party-profile-panel__clear"
            aria-label="Clear party name"
            onClick={() => setName("")}
          >
            <CloseIcon className="party-profile-panel__clear-icon" />
          </button>
        )}
      </div>

      <button
        type="button"
        className="party-profile-panel__save"
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? "Saving..." : "Save"}
      </button>

      {error && <p className="party-profile-panel__error">{error}</p>}
    </section>
  );
}
