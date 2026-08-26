/**
 * Text / TextInput עם תקרת הגדלה.
 *
 * הרקע (26/08/2026): אלעד צילם את מסך ההרשמה והכיתוב "שם פרטי ומשפחה"
 * נראה גדול ומרוח על כל רוחב השדה. בקוד אין ריווח אותיות ואין גופן חריג,
 * ובמכשיר עם הגדרות ברירת מחדל המסך תקין לגמרי.
 *
 * השורש: iOS מגדיל טקסט לפי "גודל טקסט" שבהגדרות הנגישות, וריאקט נייטיב
 * מכבד את זה בלי תקרה. אומת בסימולטור — בהגדרה accessibility-extra-extra-large
 * המסך נשבר בדיוק כמו בצילום: הלוגו נדחק אל מחוץ למסך, הכותרת נכנסת לשורת
 * הסטטוס, ורק שני שדות נכנסים. הכיתוב בשדה נמתח כי הגופן גדל מעבר לרוחב
 * השדה ו-UITextField מותח אותו כדי להכניס אותו — "גדול ועם רווחים".
 *
 * למה עטיפה ולא הגדרה גלובלית: ב-React 19 אין defaultProps לרכיבי פונקציה,
 * וב-React Native 0.81 ‏Text ו-TextInput הם רכיבי פונקציה רגילים בלי
 * forwardRef — כלומר אין נקודת אחיזה גלובלית. נוסה ונכשל בפועל.
 *
 * לא מבטלים הגדלה — זו נגישות אמיתית ואפל מצפה לה. רק עוצרים אותה
 * לפני שהיא שוברת פריסה. כל מסך יכול לעקוף עם maxFontSizeMultiplier משלו.
 */
import { forwardRef } from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';

export const MAX_FONT_SCALE = 1.2;

export const Text = forwardRef(function Text(props, ref) {
  return <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} ref={ref} />;
});

export const TextInput = forwardRef(function TextInput(props, ref) {
  return <RNTextInput maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} ref={ref} />;
});
