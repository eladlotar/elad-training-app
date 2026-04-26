import AsyncStorage from '@react-native-async-storage/async-storage';
import { callFunction } from '../constants/api';

const USER_KEY = 'elad_app_user';

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

/**
 * Login or register — calls Base44 mobileAppApi
 * If customer exists by phone, returns existing profile
 * If not, creates new customer
 */
export async function loginOrRegister(phone, fullName) {
  const result = await callFunction('mobileAppApi', {
    action: 'login',
    phone,
    full_name: fullName,
  });

  if (!result.ok) {
    throw new Error(result.error || 'שגיאה בהתחברות');
  }

  // Save customer data locally
  await saveUser(result.customer);
  return result;
}
