import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { saveUser } from '../src/services/auth';
import { C } from '../src/constants/theme';

export default function LoginScreen() {
  const [step, setStep] = useState('phone'); // phone -> name
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneSubmit = () => {
    const cleaned = phone.replace(/[\s\-\+]/g, '');
    if (cleaned.length < 9) {
      Alert.alert('שגיאה', 'נא להזין מספר טלפון תקין');
      return;
    }
    setStep('name');
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('שגיאה', 'נא להזין שם מלא');
      return;
    }
    setLoading(true);
    try {
      const cleaned = phone.replace(/[\s\-\+]/g, '');
      // Save locally
      const userData = {
        phone: cleaned,
        full_name: name.trim(),
        registered_at: new Date().toISOString(),
      };
      await saveUser(userData);
      router.replace('/(tabs)/home');
    } catch (e) {
      Alert.alert('שגיאה', 'משהו השתבש, נסה שוב');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>E</Text>
          </View>
          <Text style={styles.title}>ELAD Training</Text>
          <Text style={styles.subtitle}>בית ספר ללוחמה בטרור</Text>
        </View>

        {step === 'phone' ? (
          <View style={styles.formArea}>
            <Text style={styles.label}>מספר טלפון</Text>
            <TextInput
              style={styles.input}
              placeholder="050-0000000"
              placeholderTextColor={C.mutedLt}
              keyboardType="phone-pad"
              textAlign="right"
              value={phone}
              onChangeText={setPhone}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.button, !phone && styles.buttonDisabled]}
              onPress={handlePhoneSubmit}
              disabled={!phone}
            >
              <Text style={styles.buttonText}>המשך</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formArea}>
            <Text style={styles.label}>שם מלא</Text>
            <TextInput
              style={styles.input}
              placeholder="השם שלך"
              placeholderTextColor={C.mutedLt}
              textAlign="right"
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={!name.trim() || loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'נרשם...' : 'הרשמה'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('phone')} style={styles.backLink}>
              <Text style={styles.backText}>חזרה</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: C.white,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: C.muted,
  },
  formArea: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: C.text,
    marginBottom: 16,
  },
  button: {
    backgroundColor: C.gold,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: C.mutedLt,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
  },
  backLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  backText: {
    fontSize: 14,
    color: C.gold,
    fontWeight: '600',
  },
});
