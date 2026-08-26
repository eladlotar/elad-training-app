/**
 * LicenseRenewalPrompt — פופ-אפ חידוש רישיון נשק (אפיון אלעד 10/08/2026)
 *
 * חודש לפני פקיעת הרישיון, בכל כניסה לאפליקציה, נשאלת השאלה "חידשת?".
 *   כן → השרת דוחף את התוקף שלוש שנים קדימה מהתוקף הקיים (confirmLicenseRenewal).
 *   לא → מסך אזהרה עם אישור; הפופ-אפ יחזור בכניסה הבאה (declineLicenseRenewal).
 *
 * הפופ-אפ לא ניתן לסגירה בלחיצה בחוץ — זו החלטה שהמתאמן חייב לקבל.
 */
import { useState } from 'react';
import {
  Modal, View, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Text } from './ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { confirmLicenseRenewal, declineLicenseRenewal } from '../services/auth';

function formatIL(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = String(dateStr).split('-');
  return d && m && y ? `${d}/${m}/${y}` : dateStr;
}

export default function LicenseRenewalPrompt({ visible, license, onDone }) {
  const { C } = useTheme();
  const s = styles(C);
  const [step, setStep] = useState('ask');   // ask | warn | done
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [newExpiry, setNewExpiry] = useState(null);

  const daysLeft = license?.days_left;
  const expiry = license?.expiry;

  async function handleYes() {
    setBusy(true); setError(null);
    try {
      const res = await confirmLicenseRenewal();
      setNewExpiry(res?.license?.expiry || null);
      setStep('done');
    } catch (e) {
      setError(e.message || 'העדכון נכשל. נסה שוב.');
    } finally {
      setBusy(false);
    }
  }

  async function handleNo() {
    setStep('warn');
    try { await declineLicenseRenewal(); } catch (_) { /* תיעוד בלבד */ }
  }

  function close() {
    setStep('ask'); setError(null); setNewExpiry(null);
    onDone && onDone();
  }

  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={s.backdrop}>
        <View style={s.card}>

          {step === 'ask' && (
            <>
              <View style={s.iconWrap}>
                <Ionicons name="shield-half-outline" size={30} color={C.black} />
              </View>
              <Text style={s.title}>רישיון הנשק שלך עומד לפוג</Text>
              <Text style={s.body}>
                לפי הרישום שלנו הרישיון בתוקף עד {formatIL(expiry)}
                {typeof daysLeft === 'number' && daysLeft >= 0 ? ` — בעוד ${daysLeft} ימים.` : '.'}
              </Text>
              <Text style={s.question}>האם כבר חידשת אותו?</Text>

              {error ? <Text style={s.error}>{error}</Text> : null}

              <TouchableOpacity style={s.primaryBtn} onPress={handleYes} disabled={busy} activeOpacity={0.8}>
                {busy
                  ? <ActivityIndicator color={C.white} />
                  : <Text style={s.primaryBtnText}>כן, חידשתי</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.ghostBtn} onPress={handleNo} disabled={busy} activeOpacity={0.7}>
                <Text style={s.ghostBtnText}>עדיין לא</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'warn' && (
            <>
              <View style={[s.iconWrap, s.iconWarn]}>
                <Ionicons name="alert-circle-outline" size={30} color={C.warn} />
              </View>
              <Text style={s.title}>יש לחדש את הרישיון</Text>
              <Text style={s.body}>
                יש לחדש את רישיון הנשק לפני מועד פקיעתו ({formatIL(expiry)}).
                {'\n\n'}
                לא ניתן יהיה להירשם לאימונים כל עוד הרישיון אינו מחודש.
                האחריות לחידוש הרישיון היא על המתאמן בלבד.
              </Text>
              <TouchableOpacity style={s.primaryBtn} onPress={close} activeOpacity={0.8}>
                <Text style={s.primaryBtnText}>הבנתי</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'done' && (
            <>
              <View style={[s.iconWrap, s.iconOk]}>
                <Ionicons name="checkmark-circle-outline" size={30} color={C.ok} />
              </View>
              <Text style={s.title}>הרישיון עודכן</Text>
              <Text style={s.body}>
                {newExpiry
                  ? `התוקף במערכת עודכן ל-${formatIL(newExpiry)}.`
                  : 'התוקף במערכת עודכן.'}
                {'\n\n'}
                אם התאריך אינו מדויק אפשר לתקן אותו במסך הרישיון.
              </Text>
              <TouchableOpacity style={s.primaryBtn} onPress={close} activeOpacity={0.8}>
                <Text style={s.primaryBtnText}>סגור</Text>
              </TouchableOpacity>
            </>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = (C) => StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    width: '100%', maxWidth: 380, backgroundColor: C.card,
    borderRadius: 18, padding: 24, alignItems: 'center',
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: C.cardAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  iconWarn: { backgroundColor: C.warnLt },
  iconOk: { backgroundColor: C.okLt },
  title: {
    fontSize: 19, fontWeight: '800', color: C.text,
    textAlign: 'center', marginBottom: 8,
  },
  body: {
    fontSize: 14, lineHeight: 21, color: C.textSecondary,
    textAlign: 'center', marginBottom: 14,
  },
  question: {
    fontSize: 16, fontWeight: '700', color: C.text,
    textAlign: 'center', marginBottom: 18,
  },
  error: {
    fontSize: 13, color: C.err, textAlign: 'center', marginBottom: 10,
  },
  primaryBtn: {
    width: '100%', backgroundColor: C.black, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 10,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: C.white },
  ghostBtn: { width: '100%', paddingVertical: 12, alignItems: 'center' },
  ghostBtnText: { fontSize: 15, fontWeight: '600', color: C.muted },
});
