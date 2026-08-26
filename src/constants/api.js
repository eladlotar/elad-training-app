// Base44 API configuration
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const APP_ID = '69d514785d252ecafe4e1756';
const BASE_URL = `https://firearm-academy-crm-fe4e1756.base44.app/api/apps/${APP_ID}/functions`;

const TIMEOUT_MS = 15000;

// Session keys — must match src/services/auth.js (imported here directly to
// avoid a circular import between api.js and auth.js).
const USER_KEY = 'elad_app_user';
const TOKEN_KEY = 'elad_app_token';

// Central expired-session handling: clear the stored session and land on the
// login screen instead of leaving the user on silent empty screens.
let handlingUnauthorized = false;

async function handleUnauthorized() {
  if (handlingUnauthorized) return;
  handlingUnauthorized = true;
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  } catch {}
  try {
    router.replace('/login');
  } catch {
    // Router not mounted yet (app boot) — storage is already cleared, so
    // app/index.js will redirect to /login on its own.
  }
  // Allow handling again after the redirect settles (parallel calls share one).
  setTimeout(() => { handlingUnauthorized = false; }, 1500);
}

/**
 * @param {string} functionName
 * @param {object} data
 * @param {{ timeoutMs?: number }} [opts] — העלאת תמונה איטית מקריאה רגילה,
 *   ולכן מסך התיקייה מבקש חלון ארוך יותר. ברירת המחדל לא השתנתה.
 */
export async function callFunction(functionName, data = {}, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs || TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': APP_ID,
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Try to surface the Hebrew error from the JSON body if there is one
      let message = `שגיאת שרת (${response.status})`;
      let errorCode = null;
      try {
        const body = await response.json();
        if (body?.error) message = body.error;
        if (body?.error_code) errorCode = body.error_code;
      } catch {}
      if (response.status === 401 || errorCode === 'unauthorized') {
        await handleUnauthorized();
        const err = new Error('ההתחברות פגה. יש להתחבר מחדש.');
        err.error_code = 'unauthorized';
        throw err;
      }
      throw new Error(message);
    }

    const result = await response.json();
    // mobileAppApi signals an expired/invalid session with HTTP 200 +
    // { ok: false, error_code: 'unauthorized' } — handle it centrally here,
    // then return the body so callers keep their normal { ok:false } flow.
    if (result && result.ok === false && result.error_code === 'unauthorized') {
      await handleUnauthorized();
    }
    return result;
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('השרת לא הגיב. בדוק חיבור לאינטרנט ונסה שוב.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
