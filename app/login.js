import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { requestOtp, verifyOtp } from '../src/services/auth';
import { C } from '../src/constants/theme';

export default function LoginScreen() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const otpRef = useRef(null);

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 9) {
      Alert.alert('שגיאה', 'יש להזין מספר טלפון תקין');
      return;
    }
    setLoading(true);
    try {
      await requestOtp(cleaned.startsWith('0') ? cleaned : '0' + cleaned);
      setStep(2);
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (e) {
      Alert.alert('שגיאה', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('שגיאה', 'יש להזין קוד בן 6 ספרות');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(otp);
      router.replace('/(tabs)/home');
    } catch (e) {
      Alert.alert('שגיאה', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.inner}>
        <View style={s.logoWrap}>
          <View style={s.logo}>
            <Text style={s.logoText}>EL</Text>
          </View>
          <Text style={s.title}>ELAD LOTAR</Text>
          <Text style={s.subtitle}>אקדמיה ללוחמה בטרור</Text>
        </View>

        {step === 1 ? (
          <View style={s.formWrap}>
            <Text style={s.label}>מספר טלפון</Text>
            <TextInput
              style={s.input}
              placeholder="050-1234567"
              placeholderTextColor={C.mutedLt}
              keyboardType="phone-pad"
              textAlign="right"
              value={phone}
              onChangeText={setPhone}
              maxLength={12}
              autoFocus
            />
            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleSendOtp}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={s.btnText}>שליחת קוד אימות</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.formWrap}>
            <Text style={s.label}>קוד אימות</Text>
            <Text style={s.hint}>נשלח קוד בן 6 ספרות למספר {phone}</Text>
            <TextInput
              ref={otpRef}
              style={[s.input, s.otpInput]}
              placeholder="------"
              placeholderTextColor={C.mutedLt}
              keyboardType="number-pad"
              textAlign="center"
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />
            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleVerifyOtp}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={s.btnText}>אימות כניסה</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => { setStep(1); setOtp(''); }}
            >
              <Text style={s.backBtnText}>שינוי מספר טלפון</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  logoWrap: { alignItems: 'center', marginBottom: 48 },
  logo: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.black,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  logoText: { fontSize: 28, fontWeight: '800', color: C.white },
  title: { fontSize: 26, fontWeight: '700', color: C.text, letterSpacing: 3 },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
  formWrap: { gap: 14 },
  label: { fontSize: 15, fontWeight: '600', color: C.text, textAlign: 'right' },
  hint: { fontSize: 13, color: C.muted, textAlign: 'right' },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: C.text,
  },
  otpInput: { fontSize: 28, letterSpacing: 12, fontWeight: '600' },
  btn: {
    backgroundColor: C.black,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, fontWeight: '700', color: C.white },
  backBtn: { alignItems: 'center', paddingVertical: 12 },
  backBtnText: { fontSize: 14, color: C.muted, textDecorationLine: 'underline' },
});
