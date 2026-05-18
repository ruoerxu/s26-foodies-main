import { buildApiUrl } from "./apiBase";

function getLocalFallbackUrl(url) {
  try {
    const parsed = new URL(url);
    const isLocalBackend =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (!isLocalBackend) {
      return null;
    }

    let swappedPath = parsed.pathname;
    if (swappedPath === "/foodies" || swappedPath.startsWith("/foodies/")) {
      swappedPath = swappedPath.replace(/^\/foodies(\/|$)/, "/s26-foodies$1");
    } else if (
      swappedPath === "/s26-foodies" ||
      swappedPath.startsWith("/s26-foodies/")
    ) {
      swappedPath = swappedPath.replace(/^\/s26-foodies(\/|$)/, "/foodies$1");
    } else {
      return null;
    }

    return `${parsed.origin}${swappedPath}${parsed.search}`;
  } catch {
    return null;
  }
}

async function requestPhp(path, options = {}) {
  const { method = "GET", body, headers = {} } = options;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const hasBody = body !== undefined;
  const shouldSendJsonContentType = hasBody && !isFormData;
  const requestOptions = {
    method,
    credentials: "include",
    headers:
      isFormData || !shouldSendJsonContentType
        ? { ...headers }
        : {
            "Content-Type": "application/json",
            ...headers,
          },
    body:
      body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  };

  const primaryUrl = buildApiUrl(path);
  let response;
  try {
    response = await fetch(primaryUrl, requestOptions);
  } catch (primaryError) {
    const fallbackUrl = getLocalFallbackUrl(primaryUrl);
    if (!fallbackUrl) {
      throw primaryError;
    }
    response = await fetch(fallbackUrl, requestOptions);
  }

  if (!response.ok) {
    let message = "Party request failed";
    try {
      const data = await response.json();
      message = data?.message || data?.error || message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function createParty(payload) {
  return requestPhp("/src/create_party.php", { method: "POST", body: payload });
}

export function getParties() {
  return requestPhp("/src/get_parties.php", { method: "GET" });
}

export function getPartyMembers(partyName) {
  return requestPhp(
    `/src/get_party_members.php?party_name=${encodeURIComponent(partyName)}`,
    {
      method: "GET",
    },
  );
}

export function listFriends(search) {
  return requestPhp(
    `/src/list_friends.php?search=${encodeURIComponent(search)}`,
    {
      method: "GET",
    },
  );
}

export function addPartyMember(partyId, targetId) {
  return requestPhp("/src/add_party_member.php", {
    method: "POST",
    body: { party_id: partyId, target_id: targetId },
  });
}

export function removePartyMember(partyId, targetId) {
  return requestPhp("/src/remove_party_member.php", {
    method: "POST",
    body: { party_id: partyId, target_id: targetId },
  });
}

export function updateParty(partyId, name, imageFile) {
  const formData = new FormData();
  formData.append("party_id", String(partyId));
  formData.append("name", name);
  if (imageFile) formData.append("image", imageFile);
  return requestPhp("/src/update_party.php", { method: "POST", body: formData });
}

export function deleteParty(partyId, partyName) {
  return requestPhp("/src/delete_party.php", {
    method: "POST",
    body: {
      party_id: Number(partyId),
      party_name: partyName,
    },
  });
}

export function getRecommendations(
  partyName,
  lat = null,
  lon = null,
  filters = {},
) {
  const parsedMaxDist = Number(filters?.maxDist);
  const maxDist = Number.isFinite(parsedMaxDist)
    ? Math.min(15, Math.max(0.5, parsedMaxDist))
    : 5;
  const mode = ["walking", "biking", "driving"].includes(filters?.mode)
    ? filters.mode
    : "driving";
  const cuisines = Array.isArray(filters?.cuisines)
    ? filters.cuisines
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];
  const priceLevels = Array.isArray(filters?.price)
    ? filters.price
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];
  const startTime =
    typeof filters?.startTime === "string" ? filters.startTime.trim() : "";
  const endTime =
    typeof filters?.endTime === "string" ? filters.endTime.trim() : "";

  return requestPhp("/src/get_recommendations.php", {
    method: "POST",
    body: {
      party_name: partyName,
      latitude: lat,
      longitude: lon,
      max_dist: maxDist,
      mode,
      cuisines,
      price: priceLevels,
      start_time: startTime,
      end_time: endTime,
    },
  });
}

export function checkSessionActive(partyName) {
  return requestPhp(
    `/src/is_session_active.php?party_name=${encodeURIComponent(partyName)}`,
    {
      method: "GET",
    },
  );
}

export function clearSession(partyName) {
  return requestPhp("/src/clear_session.php", {
    method: "POST",
    body: { party_name: partyName },
  });
}

export function createSession(payload) {
  return requestPhp("/src/create_session.php", {
    method: "POST",
    body: payload,
  });
}

export function getVisited(partyName) {
  return requestPhp(
    `/src/get_visited.php?party_name=${encodeURIComponent(partyName)}`,
    {
      method: "GET",
    },
  );
}

export function markVisited(partyName, restaurantId) {
  return requestPhp("/src/mark_visited.php", {
    method: "POST",
    body: { party_name: partyName, restaurant_id: restaurantId },
  });
}

export function markVisitedWithRating({
  userId,
  partyId,
  restaurantId,
  name,
  tags,
  rating,
}) {
  const formData = new FormData();
  formData.append("user_id", String(userId));
  formData.append("party_id", String(partyId));
  formData.append("restaurant_id", String(restaurantId));
  formData.append("name", String(name));
  formData.append("tags", String(tags));
  formData.append("rating", String(rating));

  return requestPhp("/src/mark_visited_with_rating.php", {
    method: "POST",
    body: formData,
  });
}

export function removeVisited(partyName, restaurantId) {
  return requestPhp("/src/remove_visited.php", {
    method: "POST",
    body: { party_name: partyName, restaurant_id: restaurantId },
  });
}
