// ELAD Training App — Level System
const LEVELS = [
  { level: 1, name: 'טירון', bullets: 0, sessions: 0 },
  { level: 2, name: 'חניך', bullets: 250, sessions: 4 },
  { level: 3, name: 'יורה', bullets: 500, sessions: 8 },
  { level: 4, name: 'מתקדם', bullets: 1000, sessions: 12 },
  { level: 5, name: 'מיומן', bullets: 1700, sessions: 16 },
  { level: 6, name: 'מומחה', bullets: 2300, sessions: 20 },
  { level: 7, name: 'לוחם', bullets: 3000, sessions: 24 },
];

export function getUserLevel(totalBullets, totalSessions) {
  let current = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalBullets >= LEVELS[i].bullets && totalSessions >= LEVELS[i].sessions) {
      current = LEVELS[i];
      break;
    }
  }

  const next = LEVELS.find(l => l.level === current.level + 1) || null;

  let bulletsProgress = 1;
  let sessionsProgress = 1;
  if (next) {
    const bulletRange = next.bullets - current.bullets;
    const sessionRange = next.sessions - current.sessions;
    bulletsProgress = bulletRange > 0
      ? Math.min((totalBullets - current.bullets) / bulletRange, 1)
      : 1;
    sessionsProgress = sessionRange > 0
      ? Math.min((totalSessions - current.sessions) / sessionRange, 1)
      : 1;
  }

  return {
    current,
    next,
    bulletsProgress,
    sessionsProgress,
    totalBullets,
    totalSessions,
  };
}

export { LEVELS };
