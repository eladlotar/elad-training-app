import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { getUser, removeUser } from '../../src/services/auth';
import { C } from '../../src/constants/theme';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'התנתקות',
      'בטוח שאתה רוצה להתנתק?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'התנתק',
          style: 'destructive',
          onPress: async () => {
            await removeUser();
            router.replace('/login');
          },
        },
      ]
    );
  };

  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user.full_name || '?')[0]}
          </Text>
        </View>
        <Text style={styles.name}>{user.full_name}</Text>
        <Text style={styles.phone}>{user.phone}</Text>
      </View>

      {/* Info Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>המידע שלי</Text>

        <InfoRow label="שם מלא" value={user.full_name} />
        <InfoRow label="טלפון" value={user.phone} />
        <InfoRow label="סוג רישיון" value={user.license_type || 'לא הוזן'} />
        <InfoRow label="תוקף רישיון" value={user.weapon_license_expiry || 'לא הוזן'} />
        <InfoRow label="סה״כ אימונים" value={String(user.total_sessions || 0)} />
        <InfoRow label="קרדיטים" value={String(user.remaining_credits || 0)} />
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>התנתקות</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 60 },

  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: C.white },
  name: { fontSize: 22, fontWeight: '800', color: C.text },
  phone: { fontSize: 14, color: C.muted, marginTop: 2 },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14, fontWeight: '800', color: C.muted,
    textAlign: 'right', marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 1,
  },

  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoLabel: { fontSize: 13, fontWeight: '700', color: C.text },
  infoValue: { fontSize: 13, color: C.muted },

  logoutBtn: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.err,
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: C.err },
});
