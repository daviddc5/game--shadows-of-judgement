import { SplitFactory } from "@splitsoftware/splitio-browserjs";

// Used when there is no SDK key or Harness can't be reached, so the game always works.
const DEFAULTS = {
  test_mode_enabled: import.meta.env.DEV,
};

const CLIENT_KEY = import.meta.env.VITE_FME_CLIENT_KEY;
const PLAYER_ID_KEY = "sojPlayerId";

let client = null;

// Stable per device so targeting rules and percentage rollouts stay consistent.
function playerId() {
  try {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export async function initFlags() {
  if (!CLIENT_KEY) return;
  client = SplitFactory({
    core: { authorizationKey: CLIENT_KEY, key: playerId() },
    startup: { readyTimeout: 2 },
  }).client();
  try {
    await client.whenReady();
  } catch {
    // Timed out: isOn() falls back to DEFAULTS until the SDK catches up.
  }
}

export function isOn(flag) {
  const treatment = client?.getTreatment(flag);
  if (treatment === "on") return true;
  if (treatment === "off") return false;
  return DEFAULTS[flag] ?? false;
}

export function onFlagsChange(listener) {
  if (!client) return () => {};
  client.on(client.Event.SDK_UPDATE, listener);
  return () => client.off(client.Event.SDK_UPDATE, listener);
}
