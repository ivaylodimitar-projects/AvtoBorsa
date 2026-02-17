const SETTINGS_KEYS = {
  backendUrl: "karbgBackendUrl",
  apiKey: "karbgApiKey",
};

const DEFAULT_BACKEND_URL = "http://localhost:8000";

const backendInput = document.getElementById("backendUrl");
const apiKeyInput = document.getElementById("apiKey");
const saveButton = document.getElementById("saveBtn");
const statusNode = document.getElementById("status");

function normalizeBackendUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) {
    return DEFAULT_BACKEND_URL;
  }
  return value.replace(/\/$/, "");
}

function setStatus(message, isError) {
  statusNode.textContent = message || "";
  statusNode.classList.remove("error", "success");
  if (!message) {
    return;
  }
  statusNode.classList.add(isError ? "error" : "success");
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get([
    SETTINGS_KEYS.backendUrl,
    SETTINGS_KEYS.apiKey,
  ]);

  backendInput.value = normalizeBackendUrl(stored[SETTINGS_KEYS.backendUrl]);
  apiKeyInput.value = String(stored[SETTINGS_KEYS.apiKey] || "");
}

async function saveSettings() {
  const backendUrl = normalizeBackendUrl(backendInput.value);
  const apiKey = String(apiKeyInput.value || "").trim();

  try {
    saveButton.disabled = true;
    await chrome.storage.sync.set({
      [SETTINGS_KEYS.backendUrl]: backendUrl,
      [SETTINGS_KEYS.apiKey]: apiKey,
    });
    setStatus("Настройките са запазени.", false);
  } catch (error) {
    setStatus(`Грешка при запис: ${error?.message || "unknown"}`, true);
  } finally {
    saveButton.disabled = false;
  }
}

saveButton.addEventListener("click", saveSettings);

loadSettings().catch((error) => {
  setStatus(`Грешка при зареждане: ${error?.message || "unknown"}`, true);
});
