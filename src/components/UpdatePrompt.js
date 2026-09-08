/**
 * UpdatePrompt — חלון "יש גרסה חדשה" (נוסף 08/09/2026)
 *
 * האפליקציה לא ידעה שיש גרסה חדשה בחנות, ולכן משתמש עם עדכון אוטומטי כבוי
 * נשאר על גרסה ישנה בלי שום הודעה. בכל פתיחה של האפליקציה שואלים את מאגר
 * החנות של אפל מה הגרסה שפורסמה, ואם היא גבוהה מהמותקנת מציגים חלון עם
 * כפתור שפותח את דף האפליקציה באפ סטור.
 *
 * הבדיקה רצה פעם אחת לכל הפעלה, נכשלת בשקט בלי רשת, ולא חוסמת את הכניסה.
 * "אחר כך" סוגר עד ההפעלה הבאה. אפל דורשת שהקישור ייפתח בחנות, לא בתוך האפליקציה.
 */
import { useEffect, useState } from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ScaledText';
import { useTheme } from '../context/ThemeContext';

const APP_STORE_ID = '6799655529';
const BUNDLE_ID = 'com.eladlotar.training';
const LOOKUP_URL = `https://itunes.apple.com/lookup?bundleId=${BUNDLE_ID}&country=il`;
const STORE_URL = `https://apps.apple.com/il/app/id${APP_STORE_ID}`;
const STORE_DEEP_LINK = `itms-apps://apps.apple.com/il/app/id${APP_STORE_ID}`;

// הגרסה שהוטמעה בקובץ ההתקנה. expoRuntimeVersion נקרא מקובץ ההגדרות הנייטיבי
// (מדיניות runtimeVersion = appVersion, ולכן זהה למספר הגרסה), ועדכון אלחוטי
// לא יכול לשנות אותו. expoConfig.version הוא גיבוי בלבד.
function installedVersion() {
  return Constants.expoRuntimeVersion || Constants.expoConfig?.version || '0';
}

// השוואת "1.0.2" מול "1.0.10" חלק-חלק, לא כמחרוזת.
export function isNewer(storeVersion, localVersion) {
  const a = String(storeVersion || '').split('.').map(n => parseInt(n, 10) || 0);
  const b = String(localVersion || '').split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

async function fetchStoreVersion() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(LOOKUP_URL, { signal: controller.signal, cache: 'no-store' });
    const data = await res.json();
    return data?.results?.[0]?.version || null;
  } finally {
    clearTimeout(timer);
  }
}

export default function UpdatePrompt() {
  const { C } = useTheme();
  const s = styles(C);
  const [storeVersion, setStoreVersion] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let alive = true;
    (async () => {
      try {
        const v = await fetchStoreVersion();
        if (alive && v && isNewer(v, installedVersion())) setStoreVersion(v);
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  async function openStore() {
    try {
      const ok = await Linking.canOpenURL(STORE_DEEP_LINK);
      await Linking.openURL(ok ? STORE_DEEP_LINK : STORE_URL);
    } catch {
      try { await Linking.openURL(STORE_URL); } catch {}
    }
  }

  const visible = !!storeVersion && !dismissed;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setDismissed(true)}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <Ionicons name="arrow-up-circle-outline" size={44} color={C.black} />
          </View>
          <Text style={s.title}>יש גרסה חדשה</Text>
          <Text style={s.body}>
            גרסה {storeVersion} של מרכז הנשק זמינה באפ סטור. מותקנת אצלך גרסה {installedVersion()}.
          </Text>
          <TouchableOpacity style={s.primaryBtn} onPress={openStore} activeOpacity={0.8}>
            <Text style={s.primaryText}>עדכן עכשיו</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={() => setDismissed(true)} activeOpacity={0.7}>
            <Text style={s.secondaryText}>אחר כך</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = (C) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: C.card, borderRadius: 18, padding: 24, alignItems: 'center' },
  iconWrap: { marginBottom: 10 },
  title: { fontSize: 20, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 8 },
  body: { fontSize: 15, color: C.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  primaryBtn: { alignSelf: 'stretch', backgroundColor: C.black, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: C.white, fontSize: 16, fontWeight: '700' },
  secondaryBtn: { alignSelf: 'stretch', paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  secondaryText: { color: C.muted, fontSize: 15, fontWeight: '600' },
});
