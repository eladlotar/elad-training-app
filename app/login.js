import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { requestOtp, verifyOtp, registerUser } from '../src/services/auth';
import { C } from '../src/constants/theme';

export default function LoginScreen() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const otpRef = useRef(null);

  // Registration fields
  const [regName, setRegName] = useState('');
  const [regIdNumber, setRegIdNumber] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regLicenseType, setRegLicenseType] = useState('');
  const [regLicenseExpiry, setRegLicenseExpiry] = useState('');

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
      const result = await verifyOtp(otp);
      if (result.isNew) {
        // New user — go to registration step
        setStep(3);
      } else {
        // Existing user — go to home
        router.replace('/(tabs)/home');
      }
    } catch (e) {
      Alert.alert('שגיאה', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regName.trim()) {
      Alert.alert('שגיאה', 'יש להזין שם מלא');
      return;
    }
    if (!regIdNumber.trim() || regIdNumber.trim().length < 7) {
      Alert.alert('שגיאה', 'יש להזין תעודת זהות תקינה');
      return;
    }
    setLoading(true);
    try {
      await registerUser({
        full_name: regName.trim(),
        id_number: regIdNumber.trim(),
        email: regEmail.trim(),
        license_type: regLicenseType.trim() || undefined,
        weapon_license_expiry: regLicenseExpiry.trim() || undefined,
      });
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
      <ScrollView
        contentContainerStyle={s.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.logoWrap}>
          <View style={s.logo}>
            <Text style={s.logoText}>EL</Text>
          </View>
          <Text style={s.title}>ELAD LOTAR</Text>
          <Text style={s.subtitle}>אקדמיה ללוחמה בטרור</Text>
        </View>

        {step === 1 && (
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
        )}

        {step === 2 && (
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

        {step === 3 && (
          <View style={s.formWrap}>
            <Text style={s.stepTitle}>הרשמה</Text>
            <Text style={s.hint}>פעם ראשונה? נשלים כמה פרטים</Text>

            <Text style={s.label}>שם מלא *</Text>
            <TextInput
              style={s.input}
              placeholder="שם פרטי ומשפחה"
              placeholderTextColor={C.mutedLt}
              textAlign="right"
              value={regName}
              onChangeText={setRegName}
              autoFocus
            />

            <Text style={s.label}>תעודת זהות *</Text>
            <TextInput
              style={s.input}
              placeholder="מספר תעודת זהות"
              placeholderTextColor={C.mutedLt}
              keyboardType="number-pad"
              textAlign="right"
              value={regIdNumber}
              onChangeText={setRegIdNumber}
              maxLength={9}
            />

            <Text style={s.label}>אימייל</Text>
            <TextInput
              style={s.input}
              placeholder="email@example.com"
              placeholderTextColor={C.mutedLt}
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign="right"
              value={regEmail}
              onChangeText={setRegEmail}
            />

            <Text style={s.optionalTitle}>אופציונלי</Text>

            <Text style={s.label}>סוג רישיון</Text>
            <TextInput
              style={s.input}
              placeholder="למשל: אקדח"
              placeholderTextColor={C.mutedLt}
              textAlign="right"
              value={regLicenseType}
              onChangeText={setRegLicenseType}
            />

            <Text style={s.label}>תוקף רישיון</Text>
            <TextInput
              style={s.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.mutedLt}
              textAlign="right"
              value={regLicenseExpiry}
              onChangeText={setRegLicenseExpiry}
              maxLength={10}
            />

            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={s.btnText}>סיום הרשמה</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => { setStep(1); setOtp(''); }}
            >
              <Text style={s.backBtnText}>חזרה</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 40 },
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
  stepTitle: { fontSize: 20, fontWeight: '800', color: C.text, textAlign: 'right' },
  optionalTitle: { fontSize: 14, fontWeight: '600', color: C.muted, textAlign: 'right', marginTop: 8 },
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
