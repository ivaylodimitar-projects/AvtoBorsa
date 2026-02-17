const DEFAULT_BACKEND_URL = "http://localhost:8000";
const SETTINGS_KEYS = {
  backendUrl: "karbgBackendUrl",
  apiKey: "karbgApiKey",
};

function normalizeBackendUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) {
    return DEFAULT_BACKEND_URL;
  }
  return value.replace(/\/$/, "");
}

async function getSettings() {
  const stored = await chrome.storage.sync.get([
    SETTINGS_KEYS.backendUrl,
    SETTINGS_KEYS.apiKey,
  ]);

  return {
    backendUrl: normalizeBackendUrl(stored[SETTINGS_KEYS.backendUrl]),
    apiKey: String(stored[SETTINGS_KEYS.apiKey] || "").trim(),
  };
}

async function importCopartListing(payload) {
  const { backendUrl, apiKey } = await getSettings();

  if (!apiKey) {
    return {
      ok: false,
      status: 0,
      error: "Липсва API ключ. Задай го от popup-а на extension-а.",
    };
  }

  const endpoint = `${backendUrl}/api/auth/import/copart/`;
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `ApiKey ${apiKey}`,
      },
      body: JSON.stringify(payload || {}),
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: `Грешка при връзка със сървъра: ${error?.message || "unknown"}`,
    };
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error:
        data?.error ||
        data?.detail ||
        "Сървърът върна грешка при импорт.",
      details: data?.details,
    };
  }

  return {
    ok: true,
    status: response.status,
    data,
  };
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get([SETTINGS_KEYS.backendUrl]);
  if (!current[SETTINGS_KEYS.backendUrl]) {
    await chrome.storage.sync.set({ [SETTINGS_KEYS.backendUrl]: DEFAULT_BACKEND_URL });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "KARBG_IMPORT_COPART") {
    return false;
  }

  importCopartListing(message.payload)
    .then((result) => sendResponse(result))
    .catch((error) => {
      sendResponse({
        ok: false,
        status: 0,
        error: `Неочаквана грешка: ${error?.message || "unknown"}`,
      });
    });

  return true;
});
