// Base44 API configuration
const APP_ID = '69d514785d252ecafe4e1756';
const BASE_URL = `https://firearm-academy-crm-fe4e1756.base44.app/api/apps/${APP_ID}/functions`;

const TIMEOUT_MS = 15000;

export async function callFunction(functionName, data = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
      try {
        const body = await response.json();
        if (body?.error) message = body.error;
      } catch {}
      throw new Error(message);
    }

    return await response.json();
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('השרת לא הגיב. בדוק חיבור לאינטרנט ונסה שוב.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Offline mode flag — true = demo data, false = live Base44 backend
export const OFFLINE_MODE = false;
