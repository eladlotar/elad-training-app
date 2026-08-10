import AsyncStorage from '@react-native-async-storage/async-storage';
import { callFunction } from '../constants/api';

const USER_KEY = 'elad_app_user';
const TOKEN_KEY = 'elad_app_token';
const OTP_KEY = 'elad_app_otp_pending';

export async function saveUser(user) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getUser() {
  const data = await AsyncStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export async function removeUser() {
  await AsyncStorage.removeItem(USER_KEY);
}

export async function saveToken(token) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken() {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

// Step 1: Request OTP for phone number
export async function requestOtp(phone) {
  const result = await callFunction('mobileAppApi', {
    action: 'requestOtp',
    phone,
  });
  if (!result.ok) throw new Error(result.error || 'שגיאה בשליחת קוד');
  await AsyncStorage.setItem(OTP_KEY, phone);
  return result;
}

// Step 2: Verify OTP code — returns { ok, isNew, customer?, token? }
export async function verifyOtp(code) {
  const phone = await AsyncStorage.getItem(OTP_KEY);
  if (!phone) throw new Error('לא נמצא מספר טלפון');

  const result = await callFunction('mobileAppApi', {
    action: 'verifyOtp',
    phone,
    code,
  });
  if (!result.ok) throw new Error(result.error || 'קוד שגוי');
  if (result.token) await saveToken(result.token);
  if (result.customer) {
    await saveUser(result.customer);
    await AsyncStorage.removeItem(OTP_KEY);
  }
  return result;
}

// Step 3: Register new user (first time only)
export async function registerUser(data) {
  const phone = await AsyncStorage.getItem(OTP_KEY);
  if (!phone) throw new Error('לא נמצא מספר טלפון');

  const result = await callFunction('mobileAppApi', {
    action: 'register',
    phone,
    ...data,
  });
  if (!result.ok) throw new Error(result.error || 'שגיאה בהרשמה');
  if (result.token) await saveToken(result.token);
  await saveUser(result.customer);
  await AsyncStorage.removeItem(OTP_KEY);
  return result;
}

/**
 * Refresh the user from the server (stats, credits, license).
 * Returns the fresh customer on success,
 * null when the session is invalid/expired (caller should log out),
 * and THROWS on network errors (caller should keep the cached user).
 */
export async function refreshMe() {
  const token = await getToken();
  if (!token) return null;
  const result = await callFunction('mobileAppApi', { action: 'getMe', token });
  if (!result.ok) return null; // invalid / expired session
  await saveUser(result.customer);
  return result.customer;
}

/** Update editable profile fields on the server (name, email, preferred day). */
export async function updateProfile(fields) {
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', {
    action: 'updateProfile',
    token,
    ...fields,
  });
  if (!result.ok) throw new Error(result.error || 'שגיאה בשמירה');
  await saveUser(result.customer);
  return result.customer;
}

/** Complete shooter details (ID, license, weapon) on the server. */
export async function updateShooterProfile(fields) {
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', {
    action: 'updateShooterProfile',
    token,
    ...fields,
  });
  if (!result.ok) throw new Error(result.error || 'שגיאה בשמירה');
  await saveUser(result.customer);
  return result.customer;
}

/**
 * Permanently delete the account (Apple guideline 5.1.1(v)).
 * The server scrubs identifying details, revokes every session and drops the
 * phone number, so the account cannot be signed into again. Local storage is
 * cleared afterwards regardless, so the app never sits in a half-deleted state.
 */
export async function deleteAccount() {
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', { action: 'deleteAccount', token });
  if (!result.ok) throw new Error(result.error || 'מחיקת החשבון נכשלה');
  await AsyncStorage.multiRemove([USER_KEY, TOKEN_KEY, OTP_KEY]);
  return true;
}

export async function logout() {
  // Revoke the session server-side FIRST. Without this the 90-day token stays
  // valid even after the user signs out, so a sold or handed-down phone keeps
  // full access to the account. Best-effort: a network failure must never trap
  // the user in a signed-in state, so we still clear local storage below.
  try {
    const token = await getToken();
    if (token) await callFunction('mobileAppApi', { action: 'logout', token });
  } catch {}
  await AsyncStorage.removeItem(USER_KEY);
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(OTP_KEY);
}

/** "כן, חידשתי" — השרת דוחף את התוקף שלוש שנים מהתוקף הקיים. */
export async function confirmLicenseRenewal() {
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', { action: 'confirmLicenseRenewal', token });
  if (!result.ok) throw new Error(result.error || 'עדכון הרישיון נכשל');
  if (result.customer) await saveUser(result.customer);
  return result;
}

/** "עדיין לא" — תיעוד בלבד; הפופ-אפ יחזור בכניסה הבאה. */
export async function declineLicenseRenewal() {
  const token = await getToken();
  if (!token) return;
  await callFunction('mobileAppApi', { action: 'declineLicenseRenewal', token });
}
