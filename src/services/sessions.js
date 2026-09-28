import { callFunction } from '../constants/api';
import { getToken } from './auth';

/**
 * Build an Error from a { ok:false } server response, preserving the
 * machine-readable fields the screens branch on (error_code,
 * cancel_days_before for late-cancel confirmations).
 */
function serverError(result, fallback) {
  const err = new Error(result?.error || fallback);
  if (result?.error_code) err.error_code = result.error_code;
  if (result?.cancel_days_before != null) err.cancel_days_before = result.cancel_days_before;
  return err;
}

// Live sessions cache — filled by getSessions(), read by the sync helpers
// so the screens can group/filter without re-fetching.
let sessionsCache = null;

// הצעת "אימון נוסף בתשלום" — מגיעה מהשרת יחד עם רשימת האימונים,
// ותקפה רק למי שגמר את מכסת המנוי החודשית. null = הפיצ'ר כבוי
// (אין מוצר פעיל או לא הוגדר קישור תשלום), והמסכים לא מציגים כלום.
let extraTrainingOffer = null;

/** { price, payment_url, hold_minutes, name } או null אם כבוי. */
export function getExtraTrainingOffer() {
  return extraTrainingOffer;
}

function activeSessions() {
  return sessionsCache || [];
}

export function getSessionsByDate() {
  const byDate = {};
  for (const s of activeSessions()) {
    if (!byDate[s.date]) byDate[s.date] = [];
    byDate[s.date].push(s);
  }
  return byDate;
}

export function getSessionDates() {
  return [...new Set(activeSessions().map(s => s.date))];
}

export function getNextSession() {
  const now = new Date();
  const upcoming = activeSessions()
    .filter(s => new Date(s.date + 'T' + (s.start_time || '00:00')) > now && s.status === 'open')
    .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
  return upcoming[0] || null;
}

/** Fetch upcoming sessions from the server and refresh the cache. */
export async function getSessions() {
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', { action: 'getSessions', token });
  if (!result.ok) throw serverError(result, 'שגיאה בטעינת אימונים');
  // Private lessons are booked by staff only — hidden from the app list.
  // (Interim title-based filter; will be replaced by product-based visibility.)
  sessionsCache = (result.sessions || []).filter(
    s => !String(s.title || '').includes('פרטי')
  );
  extraTrainingOffer = result.extra_training || null;
  return sessionsCache;
}

/**
 * פותח שריון מקום לאימון ספציפי ומחזיר את קישור התשלום.
 * השריון תופס את המקום למשך hold_minutes — אם התשלום לא הושלם,
 * הוא פוקע מעצמו והמקום חוזר למכירה.
 * מי שכבר פתח שריון לאותו אימון מקבל אותו בחזרה (resumed) ולא נחסם.
 */
export async function startExtraTrainingPayment(sessionId) {
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', {
    action: 'startExtraTrainingPayment',
    token,
    session_id: sessionId,
  });
  if (!result.ok) throw serverError(result, 'לא ניתן לפתוח תשלום');
  return result;
}

export async function enrollInSession(customerId, sessionId) {
  // customerId is intentionally NOT sent — the server derives the customer
  // from the session token (never trusts a client-supplied id).
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', {
    action: 'enroll',
    token,
    session_id: sessionId,
  });
  if (!result.ok) throw serverError(result, 'שגיאה בהרשמה');
  return result.enrollment;
}

export async function getMyEnrollments() {
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', {
    action: 'getMyEnrollments',
    token,
  });
  if (!result.ok) throw serverError(result, 'שגיאה בטעינה');
  return result.enrollments;
}

/**
 * Cancel an enrollment.
 * Inside the cancellation window the server refuses with
 * error_code 'late_confirm_required' until the user explicitly agrees to
 * burn the entry — retry with opts.acknowledgeBurn = true.
 * Resolves to the server result ({ ok: true, late_cancelled? }).
 */
export async function cancelEnrollment(enrollmentId, opts = {}) {
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const payload = {
    action: 'cancelEnrollment',
    token,
    enrollment_id: enrollmentId,
  };
  if (opts.acknowledgeBurn === true) payload.acknowledge_burn = true;
  const result = await callFunction('mobileAppApi', payload);
  if (!result.ok) throw serverError(result, 'שגיאה בביטול');
  return result;
}
