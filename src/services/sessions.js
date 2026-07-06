import { callFunction, OFFLINE_MODE } from '../constants/api';
import { getToken } from './auth';

// Demo sessions — used only when OFFLINE_MODE is true
const DEMO_SESSIONS = [
  {
    id: 's1',
    title: 'אימון ירי מבצעי',
    type: 'training',
    date: '2026-05-25',
    start_time: '09:00',
    end_time: '11:00',
    location: 'מטווח מרכזי',
    instructor_name: 'יוסי כהן',
    max_participants: 12,
    enrolled_count: 8,
    status: 'open',
  },
  {
    id: 's2',
    title: 'קורס לחימה קרובה',
    type: 'course',
    date: '2026-05-25',
    start_time: '17:00',
    end_time: '19:00',
    location: 'אולם אימונים',
    instructor_name: 'דני לוי',
    max_participants: 15,
    enrolled_count: 15,
    status: 'full',
  },
];

let demoEnrollments = [];

// Live sessions cache — filled by getSessions(), read by the sync helpers
// so the screens can group/filter without re-fetching.
let sessionsCache = null;

function activeSessions() {
  if (OFFLINE_MODE) return DEMO_SESSIONS;
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

// Get week days starting from a given date (7 days)
export function getWeekDays(startDate) {
  const days = [];
  const d = new Date(startDate);
  // Go back to Sunday
  d.setDate(d.getDate() - d.getDay());
  for (let i = 0; i < 7; i++) {
    const date = new Date(d);
    date.setDate(d.getDate() + i);
    days.push({
      date: dateToStr(date),
      dayName: HEB_DAYS_SHORT[date.getDay()],
      dayNum: date.getDate(),
      isToday: dateToStr(date) === dateToStr(new Date()),
    });
  }
  return days;
}

const HEB_DAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function dateToStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Fetch upcoming sessions from the server and refresh the cache. */
export async function getSessions() {
  if (OFFLINE_MODE) return DEMO_SESSIONS;
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', { action: 'getSessions', token });
  if (!result.ok) throw new Error(result.error || 'שגיאה בטעינת אימונים');
  // Private lessons are booked by staff only — hidden from the app list.
  // (Interim title-based filter; will be replaced by product-based visibility.)
  sessionsCache = (result.sessions || []).filter(
    s => !String(s.title || '').includes('פרטי')
  );
  return sessionsCache;
}

export async function enrollInSession(customerId, sessionId) {
  if (OFFLINE_MODE) {
    const session = DEMO_SESSIONS.find(s => s.id === sessionId);
    if (!session) throw new Error('אימון לא נמצא');
    if (demoEnrollments.find(e => e.session_id === sessionId)) {
      throw new Error('כבר רשום לאימון הזה');
    }
    const enrollment = {
      id: 'enr_' + Date.now(),
      session_id: sessionId,
      session_title: session.title,
      session_date: session.date,
      session_time: session.start_time,
      session_location: session.location,
      instructor_name: session.instructor_name,
      status: 'confirmed',
    };
    demoEnrollments.push(enrollment);
    return enrollment;
  }
  // customerId is intentionally NOT sent — the server derives the customer
  // from the session token (never trusts a client-supplied id).
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', {
    action: 'enroll',
    token,
    session_id: sessionId,
  });
  if (!result.ok) throw new Error(result.error || 'שגיאה בהרשמה');
  return result.enrollment;
}

export async function getMyEnrollments() {
  if (OFFLINE_MODE) return demoEnrollments;
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', {
    action: 'getMyEnrollments',
    token,
  });
  if (!result.ok) throw new Error(result.error || 'שגיאה בטעינה');
  return result.enrollments;
}

export async function cancelEnrollment(enrollmentId) {
  if (OFFLINE_MODE) {
    demoEnrollments = demoEnrollments.filter(e => e.id !== enrollmentId);
    return true;
  }
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', {
    action: 'cancelEnrollment',
    token,
    enrollment_id: enrollmentId,
  });
  if (!result.ok) throw new Error(result.error || 'שגיאה בביטול');
  return true;
}
