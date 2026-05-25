import { callFunction, OFFLINE_MODE } from '../constants/api';

// Demo sessions — late May / early June 2026
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
  {
    id: 's3',
    title: 'אימון הגנה עצמית',
    type: 'training',
    date: '2026-05-26',
    start_time: '10:00',
    end_time: '12:00',
    location: 'אולם אימונים',
    instructor_name: 'אבי שמש',
    max_participants: 10,
    enrolled_count: 4,
    status: 'open',
  },
  {
    id: 's4',
    title: 'אימון טקטי מתקדם',
    type: 'training',
    date: '2026-05-27',
    start_time: '08:00',
    end_time: '11:00',
    location: 'שטח אימונים',
    instructor_name: 'משה דוד',
    max_participants: 8,
    enrolled_count: 6,
    status: 'open',
  },
  {
    id: 's5',
    title: 'ירי אקדח למתחילים',
    type: 'training',
    date: '2026-05-28',
    start_time: '14:00',
    end_time: '16:00',
    location: 'מטווח מרכזי',
    instructor_name: 'יוסי כהן',
    max_participants: 10,
    enrolled_count: 2,
    status: 'open',
  },
  {
    id: 's6',
    title: 'אימון CQB',
    type: 'training',
    date: '2026-05-29',
    start_time: '09:00',
    end_time: '12:00',
    location: 'מתחם אימונים טקטי',
    instructor_name: 'דני לוי',
    max_participants: 8,
    enrolled_count: 5,
    status: 'open',
  },
  {
    id: 's7',
    title: 'ירי רובה ארוך',
    type: 'training',
    date: '2026-05-31',
    start_time: '08:00',
    end_time: '11:00',
    location: 'מטווח מרכזי',
    instructor_name: 'משה דוד',
    max_participants: 6,
    enrolled_count: 3,
    status: 'open',
  },
  {
    id: 's8',
    title: 'סדנת מודעות ביטחונית',
    type: 'course',
    date: '2026-06-01',
    start_time: '18:00',
    end_time: '20:00',
    location: 'כיתת לימוד',
    instructor_name: 'אבי שמש',
    max_participants: 20,
    enrolled_count: 12,
    status: 'open',
  },
  {
    id: 's9',
    title: 'אימון ירי דינמי',
    type: 'training',
    date: '2026-06-02',
    start_time: '10:00',
    end_time: '12:00',
    location: 'מטווח מרכזי',
    instructor_name: 'יוסי כהן',
    max_participants: 10,
    enrolled_count: 7,
    status: 'open',
  },
  {
    id: 's10',
    title: 'אימון הגנה בסכין',
    type: 'training',
    date: '2026-06-03',
    start_time: '17:00',
    end_time: '19:00',
    location: 'אולם אימונים',
    instructor_name: 'דני לוי',
    max_participants: 12,
    enrolled_count: 9,
    status: 'open',
  },
];

let demoEnrollments = [];

export function getSessionsByDate() {
  const byDate = {};
  for (const s of DEMO_SESSIONS) {
    if (!byDate[s.date]) byDate[s.date] = [];
    byDate[s.date].push(s);
  }
  return byDate;
}

export function getSessionDates() {
  return [...new Set(DEMO_SESSIONS.map(s => s.date))];
}

export function getNextSession() {
  const now = new Date();
  const upcoming = DEMO_SESSIONS
    .filter(s => new Date(s.date + 'T' + s.start_time) > now && s.status === 'open')
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

export async function getSessions() {
  if (OFFLINE_MODE) return DEMO_SESSIONS;
  const result = await callFunction('mobileAppApi', { action: 'getSessions' });
  if (!result.ok) throw new Error(result.error);
  return result.sessions;
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
    session.enrolled_count++;
    if (session.enrolled_count >= session.max_participants) session.status = 'full';
    return enrollment;
  }
  const result = await callFunction('mobileAppApi', {
    action: 'enroll',
    customer_id: customerId,
    session_id: sessionId,
  });
  if (!result.ok) throw new Error(result.error);
  return result.enrollment;
}

export async function getMyEnrollments(customerId) {
  if (OFFLINE_MODE) return demoEnrollments;
  const result = await callFunction('mobileAppApi', {
    action: 'getMyEnrollments',
    customer_id: customerId,
  });
  if (!result.ok) throw new Error(result.error);
  return result.enrollments;
}

export async function cancelEnrollment(enrollmentId) {
  if (OFFLINE_MODE) {
    const enrollment = demoEnrollments.find(e => e.id === enrollmentId);
    if (enrollment) {
      const session = DEMO_SESSIONS.find(s => s.id === enrollment.session_id);
      if (session) {
        session.enrolled_count--;
        if (session.status === 'full') session.status = 'open';
      }
    }
    demoEnrollments = demoEnrollments.filter(e => e.id !== enrollmentId);
    return true;
  }
  const result = await callFunction('mobileAppApi', {
    action: 'cancelEnrollment',
    enrollment_id: enrollmentId,
  });
  if (!result.ok) throw new Error(result.error);
  return true;
}
