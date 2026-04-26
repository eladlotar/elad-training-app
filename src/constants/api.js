// Base44 API configuration
const APP_ID = '69d514785d252ecafe4e1756';
const BASE_URL = `https://firearm-academy-crm-fe4e1756.base44.app/api/apps/${APP_ID}/functions`;

export async function callFunction(functionName, data = {}) {
  const response = await fetch(`${BASE_URL}/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Id': APP_ID,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
}
