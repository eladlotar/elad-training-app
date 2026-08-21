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
 * היסטוריית האימונים של המתאמן, מתוך יומן היורים בצד השרת.
 *
 * הנתונים האלה היו במערכת מהיום הראשון — המסכים הציגו מהם רק שני
 * מספרים מצטברים (סך כדורים וסך אימונים) והשאר לא נחשף מעולם.
 *
 * מחזיר { summary, history, has_more }. הסיכומים מחושבים בשרת על
 * **כל** הרשומות ולא רק על העמוד שהוחזר, כדי שהמספרים לא ישתנו
 * לפי כמות השורות שביקשנו.
 */
export async function getMyTrainingHistory(limit = 100) {
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', {
    action: 'getMyTrainingHistory', token, limit,
  });
  if (!result.ok) throw serverError(result, 'שגיאה בטעינת היסטוריית האימונים');
  return {
    summary: result.summary || {},
    history: result.history || [],
    hasMore: !!result.has_more,
  };
}
