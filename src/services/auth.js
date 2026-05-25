import AsyncStorage from '@react-native-async-storage/async-storage';
import { callFunction, OFFLINE_MODE } from '../constants/api';

const USER_KEY = 'elad_app_user';
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

// Step 1: Request OTP for phone number
export async function requestOtp(phone) {
  if (OFFLINE_MODE) {
    // Mock: store phone, any 6 digits will work
    await AsyncStorage.setItem(OTP_KEY, phone);
    return { ok: true };
  }
  const result = await callFunction('mobileAppApi', {
    action: 'requestOtp',
    phone,
  });
  if (!result.ok) throw new Error(result.error || 'שגיאה בשליחת קוד');
  await AsyncStorage.setItem(OTP_KEY, phone);
  return result;
}

// Step 2: Verify OTP code
export async function verifyOtp(code) {
  const phone = await AsyncStorage.getItem(OTP_KEY);
  if (!phone) throw new Error('לא נמצא מספר טלפון');

  if (OFFLINE_MODE) {
    // Mock: accept any 6 digit code
    if (code.length !== 6) throw new Error('קוד חייב להיות 6 ספרות');
    const userData = {
      id: 'local_' + phone.slice(-6),
      full_name: 'אלעד אטיאס',
      phone: phone,
      email: 'elad@lotar.co.il',
      status: 'active',
      membership_type: 'premium',
      remaining_credits: 8,
      total_sessions: 24,
      member_since: '2025-03-15',
      last_training_date: '2026-04-20',
      weapon_license_expiry: '2026-06-15',
      license_type: 'אקדח',
      preferred_day: 'ראשון',
      tags: ['VIP'],
    };
    await saveUser(userData);
    await AsyncStorage.removeItem(OTP_KEY);
    return { ok: true, customer: userData };
  }

  const result = await callFunction('mobileAppApi', {
    action: 'verifyOtp',
    phone,
    code,
  });
  if (!result.ok) throw new Error(result.error || 'קוד שגוי');
  await saveUser(result.customer);
  await AsyncStorage.removeItem(OTP_KEY);
  return result;
}

export async function logout() {
  await AsyncStorage.removeItem(USER_KEY);
  await AsyncStorage.removeItem(OTP_KEY);
}
