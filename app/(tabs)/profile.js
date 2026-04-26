import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getUser, removeUser, saveUser } from '../../src/services/auth';
import { getProfile, getMyEnrollments, cancelEnrollment } from '../../src/services/sessions';
import { C } from '../../src/constants/theme';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const u = await getUser();
    if (u?.id) {
      try {
        const fresh = await getProfile(u.id);
        await saveUser(fresh); // Update local cache
        setUser(fresh);
      } catch {
        setUser(u); // Use cached data if API fails
      }
      try {
        const all = await getMyEnrollments(u.id);
        setEnrollments(all.filter(e => e.status !== 'cancelled'));
      } catch {}
    } else {
      setUser(u);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCancel = (enrollment) => {
    Alert.alert(
      'ביטול רישום',
      `לבטל את הרישום ל${enrollment.session_title}?`,
      [
        { text: 'לא', style: 'cancel' },
        {
          text: 'בטל רישום',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelEnrollment(enrollment.id);
              Alert.alert('בוטל', 'הרישום בוטל בהצלחה');
              await loadData();
            } catch (e) {
              Alert.alert('שגיאה', e.message || 'לא הצלחנו לבטל');
            }
          },
        },
      ]
    );
  };

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

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = enrollments.filter(e => e.session_date >= today);
  const past = enrollments.filter(e => e.session_date < today);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.gold} />
      }
    >
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user.full_name || '?')[0]}</Text>
        </View>
        <Text style={styles.name}>{user.full_name}</Text>
        <Text style={styles.phone}>{user.phone}</Text>
        {user.membership_type && user.membership_type !== 'none' && (
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>
              {user.membership_type === 'gold' ? 'חבר זהב' : 'חבר כסף'}
            </Text>
          </View>
        )}
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

      {/* Upcoming enrollments */}
      {upcoming.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>אימונים קרובים ({upcoming.length})</Text>
          {upcoming.map(e => (
            <View key={e.id} style={styles.enrollmentCard}>
              <View style={styles.enrollmentInfo}>
                <Text style={styles.enrollmentTitle}>{e.session_title}</Text>
                <Text style={styles.enrollmentDate}>{e.session_date}</Text>
              </View>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => handleCancel(e)}
              >
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Past enrollments */}
      {past.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>היסטוריה ({past.length})</Text>
          {past.slice(0, 10).map(e => (
            <View key={e.id} style={[styles.enrollmentCard, styles.pastCard]}>
              <View style={styles.enrollmentInfo}>
                <Text style={[styles.enrollmentTitle, styles.pastText]}>{e.session_title}</Text>
                <Text style={styles.enrollmentDate}>{e.session_date}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {e.status === 'attended' ? 'השתתף' : e.status === 'no_show' ? 'לא הגיע' : 'בוצע'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Logout */}
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
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.gold,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    shadowColor: C.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: C.white },
  name: { fontSize: 22, fontWeight: '800', color: C.text },
  phone: { fontSize: 14, color: C.muted, marginTop: 2 },
  memberBadge: {
    backgroundColor: C.goldLt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8,
    borderWidth: 1, borderColor: C.gold,
  },
  memberBadgeText: { fontSize: 12, fontWeight: '700', color: C.goldDark },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14, fontWeight: '800', color: C.muted,
    textAlign: 'right', marginBottom: 10, letterSpacing: 1,
  },

  infoRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 10, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: C.border,
  },
  infoLabel: { fontSize: 13, fontWeight: '700', color: C.text },
  infoValue: { fontSize: 13, color: C.muted },

  enrollmentCard: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 10, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: C.border,
  },
  pastCard: { opacity: 0.7 },
  enrollmentInfo: { flex: 1, alignItems: 'flex-end' },
  enrollmentTitle: { fontSize: 13, fontWeight: '700', color: C.text },
  pastText: { color: C.muted },
  enrollmentDate: { fontSize: 11, color: C.muted, marginTop: 2 },
  cancelBtn: {
    backgroundColor: C.errLt, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: C.err,
  },
  cancelBtnText: { fontSize: 11, fontWeight: '700', color: C.err },
  statusBadge: {
    backgroundColor: C.cardAlt, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusText: { fontSize: 10, fontWeight: '700', color: C.muted },

  logoutBtn: {
    backgroundColor: C.card, borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: C.err,
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: C.err },
});
