import { callFunction, OFFLINE_MODE } from '../constants/api';
import { getToken } from './auth';

/**
 * Build an Error from a { ok:false } server response, preserving the
 * machine-readable error_code (the screens branch on it).
 */
function serverError(result, fallback) {
  const err = new Error(result?.error || fallback);
  if (result?.error_code) err.error_code = result.error_code;
  return err;
}

/** Shop catalog: products + owned/pending flags for this customer. */
export async function getProducts() {
  if (OFFLINE_MODE) return [];
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', { action: 'getProducts', token });
  if (!result.ok) throw serverError(result, 'שגיאה בטעינת החנות');
  return result.products || [];
}

/**
 * My subscriptions + pending requests + discipline counters.
 * Returns { subscriptions, pending_requests, late_cancel_count, no_show_count }.
 */
export async function getMySubscription() {
  if (OFFLINE_MODE) {
    return { subscriptions: [], pending_requests: [], late_cancel_count: 0, no_show_count: 0 };
  }
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', { action: 'getMySubscription', token });
  if (!result.ok) throw serverError(result, 'שגיאה בטעינת המנוי');
  return {
    subscriptions: result.subscriptions || [],
    pending_requests: result.pending_requests || [],
    late_cancel_count: result.late_cancel_count || 0,
    no_show_count: result.no_show_count || 0,
  };
}

/** Ask to join a subscription (backup flow when no payment page exists). */
export async function requestSubscription(productId) {
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', {
    action: 'requestSubscription',
    token,
    product_id: productId,
    source: 'app',
  });
  if (!result.ok) throw serverError(result, 'שגיאה בשליחת הבקשה');
  return result.request;
}

/** Cancel a pending subscription request. */
export async function cancelSubscriptionRequest(requestId) {
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', {
    action: 'cancelSubscriptionRequest',
    token,
    request_id: requestId,
  });
  if (!result.ok) throw serverError(result, 'שגיאה בביטול הבקשה');
  return true;
}
