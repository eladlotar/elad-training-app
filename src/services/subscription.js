import { callFunction } from '../constants/api';
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

/**
 * קטלוג הציוד הוסר מהאפליקציה ב-31/08/2026 (הנחיה 1.1.3 של אפל).
 * הנקודה `getStoreProducts` עדיין חיה בשרת ומשרתת את האתר —
 * האפליקציה פשוט לא קוראת לה יותר. אין להחזיר אותה לכאן.
 */


/** Shop catalog: products + owned/pending flags for this customer. */
export async function getProducts() {
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
