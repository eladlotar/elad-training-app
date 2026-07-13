import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/context/ThemeContext';

// דף התשלום של גרואו מוטמע בתוך האפליקציה (החלטת אלעד 13/07) — לא נפתח
// דפדפן חיצוני ולא גיליון דפדפן. פתיחת המנוי עצמה קורית בשרת דרך
// growSubscriptionWebhook; המסך הזה רק מארח את דף הסליקה ומחזיר לחנות.
const SUCCESS_HINTS = [
  'success', 'thank', 'approved', 'confirmation', 'paymentsuccess', 'completed',
];

export default function PaymentScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);
  const router = useRouter();
  const { url, name } = useLocalSearchParams();
  const [paid, setPaid] = useState(false);
  const [failed, setFailed] = useState(false);
  const webRef = useRef(null);

  const detectSuccess = useCallback((navState) => {
    const u = String(navState?.url || '').toLowerCase();
    if (SUCCESS_HINTS.some((h) => u.includes(h))) setPaid(true);
  }, []);

  const close = () => {
    if (paid) { router.back(); return; }
    Alert.alert('יציאה מדף התשלום', 'לצאת בלי להשלים את התשלום?', [
      { text: 'להישאר', style: 'cancel' },
      { text: 'יציאה', style: 'destructive', onPress: () => router.back() },
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

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
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

      {/* Payment page, embedded */}
      {failed ? (
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
          style={s.web}
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

      {/* Success banner — the webhook opens the membership server-side */}
      {paid && (
        <View style={s.paidBar}>
          <View style={s.paidTextWrap}>
            <Text style={s.paidTitle}>התשלום התקבל!</Text>
            <Text style={s.paidText}>המנוי ייפתח אוטומטית תוך רגע ותתקבל הודעת וואטסאפ.</Text>
          </View>
          <TouchableOpacity style={s.paidBtn} onPress={() => router.back()}>
            <Text style={s.paidBtnText}>חזרה לחנות</Text>
          </TouchableOpacity>
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
    paddingTop: 58,
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

  paidBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingBottom: 28,
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
});
