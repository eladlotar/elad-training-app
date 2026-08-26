/**
 * documents — התיקייה האישית של המתאמן, שמורה בשרת.
 *
 * ⚠️ נוצר 24/08/2026. עד אליו התיקייה הייתה מקומית בלבד: הקובץ הועתק ל-
 * documentDirectory/elad_folder/ והמטא-דאטה ישבה ב-AsyncStorage. באפליקציה
 * זה שרד (בניגוד לפורטל, שם ספארי מחק הכל אחרי 7 ימים) — אבל עדיין:
 * אפס גיבוי, אפס סנכרון בין מכשירים, ואלעד לא ראה את האסמכתאות.
 * מתאמן שמחק את האפליקציה או החליף טלפון איבד את אסמכתאות הריענון שלו.
 *
 * עכשיו הקובץ עולה לאחסון הקבוע של בייס44 דרך mobileAppApi.
 */
import { callFunction } from '../constants/api';
import { getToken } from './auth';

/** חלון ארוך יותר להעלאה — תמונה כבדה מקריאה רגילה, במיוחד ברשת סלולרית. */
const UPLOAD_TIMEOUT_MS = 60000;

function serverError(result, fallback) {
  const err = new Error(result?.error || fallback);
  if (result?.error_code) err.error_code = result.error_code;
  return err;
}

/** כל המסמכים של המתאמן המחובר, החדשים ראשונים. */
export async function listMyDocuments() {
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', { action: 'listMyDocuments', token });
  if (!result.ok) throw serverError(result, 'שגיאה בטעינת התיקייה');
  return { documents: result.documents || [], maxDocs: result.max_docs || 100 };
}

/**
 * העלאת מסמך. `dataB64` הוא תוכן הקובץ בקידוד base64 (בלי קידומת dataURL,
 * אבל השרת סבלני גם לקידומת). `localId` מונע כפילות בהעברה מהמכשיר —
 * אותו מזהה יחזיר את הרשומה הקיימת במקום ליצור עותק שני.
 */
export async function uploadMyDocument({ dataB64, mimeType, title, fileName, localId, capturedAt, source }) {
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', {
    action: 'uploadMyDocument',
    token,
    data_b64: dataB64,
    mime_type: mimeType || 'image/jpeg',
    title: title || '',
    file_name: fileName || '',
    local_id: localId || '',
    captured_at: capturedAt || null,
    source: source || 'app',
  }, { timeoutMs: UPLOAD_TIMEOUT_MS });
  if (!result.ok) throw serverError(result, 'העלאת התמונה נכשלה');
  return result.document;
}

export async function updateMyDocument(documentId, title) {
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', {
    action: 'updateMyDocument', token, document_id: documentId, title: title || '',
  });
  if (!result.ok) throw serverError(result, 'שמירת הכותרת נכשלה');
  return true;
}

export async function deleteMyDocument(documentId) {
  const token = await getToken();
  if (!token) throw new Error('יש להתחבר מחדש');
  const result = await callFunction('mobileAppApi', {
    action: 'deleteMyDocument', token, document_id: documentId,
  });
  if (!result.ok) throw serverError(result, 'המחיקה נכשלה');
  return true;
}
