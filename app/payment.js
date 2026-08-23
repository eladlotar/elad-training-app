import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMySubscription } from '../src/services/subscription';
import { useTheme } from '../src/context/ThemeContext';

// דף התשלום של גרואו מוטמע בתוך האפליקציה (החלטת אלעד 13/07) — לא נפתח
// דפדפן חיצוני ולא גיליון דפדפן. פתיחת המנוי עצמה קורית בשרת דרך
// growSubscriptionWebhook; המסך הזה רק מארח את דף הסליקה ומחזיר לחנות.
// מילות מפתח בכתובת הן רק רמז — אישור הצלחה אמיתי מגיע מבדיקה מול השרת
// (getMySubscription) שהמנוי או הבקשה אכן נוצרו.
const SUCCESS_HINTS = [
  'success', 'thank', 'approved', 'confirmation', 'paymentsuccess', 'completed',
];

const VERIFY_ATTEMPTS = 3;
const VERIFY_DELAY_MS = 2500;

export default function PaymentScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { url, name } = useLocalSearchParams();
  // idle → checking → confirmed | unknown
  const [status, setStatus] = useState('idle');
  // The user chose to leave the payment page — show the status view instead
  const [exiting, setExiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const webRef = useRef(null);
  const baselineRef = useRef(null);
  const checkingRef = useRef(false);
  const confirmedRef = useRef(false);

  // Snapshot how many subscriptions/pending requests existed BEFORE the
  // payment, so "success" means something new actually appeared.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await getMySubscription();
        if (alive) {
          baselineRef.current =
            (d.subscriptions?.length || 0) + (d.pending_requests?.length || 0);
        }
      } catch {
        // Baseline unknown — any entitlement found later counts as success
      }
    })();
    return () => { alive = false; };
  }, []);

  const verifyPayment = async () => {
    if (checkingRef.current || confirmedRef.current) return;
    checkingRef.current = true;
    setStatus('checking');
    const baseline = baselineRef.current;
    for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt++) {
      try {
        const d = await getMySubscription();
        const count =
          (d.subscriptions?.length || 0) + (d.pending_requests?.length || 0);
        // בלי צילום מצב התחלתי אי אפשר להבחין בין מנוי ותיק לרכישה חדשה — לא מכריזים הצלחה
        if (baseline != null && count > baseline) {
          confirmedRef.current = true;
          checkingRef.current = false;
          setStatus('confirmed');
          return;
        }
      } catch {}
      if (attempt < VERIFY_ATTEMPTS - 1) {
        await new Promise(r => setTimeout(r, VERIFY_DELAY_MS));
      }
    }
    checkingRef.current = false;
    setStatus('unknown');
  };

  const detectSuccess = (navState) => {
    const u = String(navState?.url || '').toLowerCase();
    if (SUCCESS_HINTS.some((h) => u.includes(h))) verifyPayment();
  };

  const close = () => {
    // Verification already finished (or the status view is showing) — just leave
    if (status === 'confirmed' || status === 'unknown' || exiting) {
      router.back();
      return;
    }
    Alert.alert('יציאה מדף התשלום', 'לצאת מדף התשלום? נבדוק אם התשלום נקלט.', [
      { text: 'להישאר', style: 'cancel' },
      {
        text: 'יציאה',
        style: 'destructive',
        onPress: () => { setExiting(true); verifyPayment(); },
      },
    ]);
  };

  if (!url) {
    return (
      <View style={s.center}>
        <Text style={s.errTitle}>קישור התשלום חסר</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>חזרה לחנות</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasBottomBar = !exiting &&
    (status === 'checking' || status === 'confirmed' || status === 'unknown');

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerText}>
          <Text style={s.headerTitle} numberOfLines={1}>{name || 'תשלום מאובטח'}</Text>
          <View style={s.secureRow}>
            <Ionicons name="lock-closed" size={12} color={C.ok} />
            <Text style={s.secureText}>תשלום מאובטח דרך גרואו</Text>
          </View>
        </View>
        <TouchableOpacity onPress={close} style={s.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={26} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* Status view after the user left the payment page */}
      {exiting ? (
        <View style={s.center}>
          {status === 'confirmed' ? (
            <>
              <Ionicons name="checkmark-circle" size={44} color={C.ok} />
              <Text style={s.errTitle}>התשלום נקלט!</Text>
              <Text style={s.errText}>המנוי מופיע בחשבון שלך במסך "המנוי שלי".</Text>
              <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                <Text style={s.backBtnText}>חזרה לחנות</Text>
              </TouchableOpacity>
            </>
          ) : status === 'unknown' ? (
            <>
              <Ionicons name="time-outline" size={44} color={C.muted} />
              <Text style={s.errTitle}>לא זוהה עדיין תשלום חדש</Text>
              <Text style={s.errText}>אם השלמת תשלום, המנוי יופיע תוך דקות.</Text>
              <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                <Text style={s.backBtnText}>חזרה לחנות</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={C.black} />
              <Text style={s.errTitle}>בודקים את סטטוס התשלום…</Text>
            </>
          )}
        </View>
      ) : failed ? (
        <View style={s.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={C.muted} />
          <Text style={s.errTitle}>דף התשלום לא נטען</Text>
          <Text style={s.errText}>בדקו את החיבור לאינטרנט ונסו שוב.</Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => { setFailed(false); webRef.current?.reload(); }}
          >
            <Text style={s.retryBtnText}>ניסיון נוסף</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webRef}
          source={{ uri: String(url) }}
          // סרגל הניווט של אנדרואיד מרחף מעל תחתית המסך. בלי הריווח הזה
          // כפתור התשלום של גרואו — שיושב בתחתית הדף — נחתך מתחתיו
          // ואי אפשר ללחוץ עליו. אומת על גלקסי A06 עם אנדרואיד 14.
          // כשמוצג סרגל תחתון משלנו הוא כבר מוסיף את השוליים בעצמו.
          style={[s.web, hasBottomBar ? null : { marginBottom: insets.bottom }]}
          onNavigationStateChange={detectSuccess}
          onError={() => setFailed(true)}
          startInLoadingState
          renderLoading={() => (
            <View style={[StyleSheet.absoluteFill, s.center]}>
              <ActivityIndicator size="large" color={C.black} />
              <Text style={s.loadingText}>טוען את דף התשלום…</Text>
            </View>
          )}
        />
      )}

      {/* Bottom bars while still on the payment page */}
      {!exiting && status === 'checking' && (
        <View style={[s.checkBar, { paddingBottom: insets.bottom + 14 }]}>
          <ActivityIndicator size="small" color={C.text} />
          <Text style={s.checkText}>מאמתים את התשלום מול השרת…</Text>
        </View>
      )}
      {!exiting && status === 'confirmed' && (
        <View style={[s.paidBar, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.paidTextWrap}>
            <Text style={s.paidTitle}>התשלום נקלט!</Text>
            <Text style={s.paidText}>המנוי מופיע בחשבון שלך ותתקבל הודעת וואטסאפ.</Text>
          </View>
          <TouchableOpacity style={s.paidBtn} onPress={() => router.back()}>
            <Text style={s.paidBtnText}>חזרה לחנות</Text>
          </TouchableOpacity>
        </View>
      )}
      {!exiting && status === 'unknown' && (
        <View style={[s.pendingBar, { paddingBottom: insets.bottom + 14 }]}>
          <Text style={s.pendingText}>אם השלמת תשלום, המנוי יופיע תוך דקות.</Text>
        </View>
      )}
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  headerText: { flex: 1, alignItems: 'flex-end' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  secureRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 2 },
  secureText: { fontSize: 12, fontWeight: '600', color: C.ok },
  closeBtn: { marginLeft: 4 },

  web: { flex: 1 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10, backgroundColor: C.bg },
  loadingText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  errTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  errText: { fontSize: 14, color: C.muted, textAlign: 'center' },
  retryBtn: {
    backgroundColor: C.black, borderRadius: 10,
    paddingVertical: 11, paddingHorizontal: 28, marginTop: 6,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: C.white },
  backBtn: {
    backgroundColor: C.black, borderRadius: 10,
    paddingVertical: 11, paddingHorizontal: 28, marginTop: 6,
  },
  backBtnText: { fontSize: 14, fontWeight: '700', color: C.white },

  checkBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.cardAlt,
  },
  checkText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },

  paidBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.okLt,
  },
  paidTextWrap: { flex: 1, alignItems: 'flex-end' },
  paidTitle: { fontSize: 15, fontWeight: '800', color: C.ok },
  paidText: { fontSize: 12.5, color: C.text, textAlign: 'right', marginTop: 2 },
  paidBtn: {
    backgroundColor: C.ok, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  paidBtnText: { fontSize: 13, fontWeight: '700', color: C.white },

  pendingBar: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.warnLt,
  },
  pendingText: { fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'center' },
});
