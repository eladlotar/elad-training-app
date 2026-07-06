import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, Alert, RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUser, refreshMe, updateProfile, logout } from '../../src/services/auth';
import { getUserLevel } from '../../src/constants/levels';
import { useTheme } from '../../src/context/ThemeContext';

export default function ProfileScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDay, setEditDay] = useState('');

  const loadData = async () => {
    let u = await getUser();
    try {
      const fresh = await refreshMe();
      if (fresh) u = fresh;
    } catch {}
    setUser(u);
    if (u) {
      setEditName(u.full_name || '');
      setEditEmail(u.email || '');
      setEditDay(u.preferred_day || '');
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      Alert.alert('שגיאה', 'שם לא יכול להיות ריק');
      return;
    }
    try {
      const updated = await updateProfile({
        full_name: editName.trim(),
        email: editEmail.trim(),
        preferred_day: editDay.trim(),
      });
      setUser(updated);
      setEditing(false);
      Alert.alert('נשמר', 'הפרטים עודכנו במערכת');
    } catch (e) {
      Alert.alert('שגיאה', e.message);
    }
  };

  const handleLogout = () => {
    Alert.alert('התנתקות', 'בטוח?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'התנתק',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  if (!user) return null;

  const initials = (user.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2);
  const totalBullets = user.total_bullets || 0;
  const totalSessions = user.total_sessions || 0;
  const levelInfo = getUserLevel(totalBullets, totalSessions);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.black} />}
    >
      {/* Avatar */}
      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.name}>{user.full_name}</Text>
        <Text style={s.phone}>{user.phone}</Text>

        {/* Level Badge */}
        <View style={s.levelBadgeRow}>
          <View style={s.levelBadge}>
            <Text style={s.levelBadgeNum}>{levelInfo.current.level}</Text>
          </View>
          <Text style={s.levelBadgeName}>{levelInfo.current.name}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statValue}>{totalSessions}</Text>
          <Text style={s.statLabel}>אימונים</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{totalBullets.toLocaleString()}</Text>
          <Text style={s.statLabel}>כדורים</Text>
        </View>
      </View>

      {/* Fields */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>פרטים אישיים</Text>
          {!editing ? (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={s.editBtn}>עריכה</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleSave}>
              <Text style={s.saveBtn}>שמירה</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.fieldCard}>
          <Text style={s.fieldLabel}>שם מלא</Text>
          {editing ? (
            <TextInput style={s.fieldInput} value={editName} onChangeText={setEditName} textAlign="right" />
          ) : (
            <Text style={s.fieldValue}>{user.full_name}</Text>
          )}
        </View>

        <View style={s.fieldCard}>
          <Text style={s.fieldLabel}>טלפון</Text>
          <Text style={s.fieldValue}>{user.phone}</Text>
        </View>

        <View style={s.fieldCard}>
          <Text style={s.fieldLabel}>אימייל</Text>
          {editing ? (
            <TextInput
              style={s.fieldInput}
              value={editEmail}
              onChangeText={setEditEmail}
              textAlign="right"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="email@example.com"
              placeholderTextColor={C.mutedLt}
            />
          ) : (
            <Text style={s.fieldValue}>{user.email || 'לא הוזן'}</Text>
          )}
        </View>

        <View style={s.fieldCard}>
          <Text style={s.fieldLabel}>יום אימון מועדף</Text>
          {editing ? (
            <TextInput
              style={s.fieldInput}
              value={editDay}
              onChangeText={setEditDay}
              textAlign="right"
              placeholder="למשל: ראשון"
              placeholderTextColor={C.mutedLt}
            />
          ) : (
            <Text style={s.fieldValue}>{user.preferred_day || 'לא נבחר'}</Text>
          )}
        </View>

        {editing && (
          <TouchableOpacity
            style={s.cancelEditBtn}
            onPress={() => {
              setEditing(false);
              setEditName(user.full_name || '');
              setEditEmail(user.email || '');
              setEditDay(user.preferred_day || '');
            }}
          >
            <Text style={s.cancelEditText}>ביטול עריכה</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Shooter profile & equipment */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>פרטי יורה וציוד</Text>
        <TouchableOpacity style={s.shooterCard} onPress={() => router.push('/(tabs)/shooter')} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={C.mutedLt} />
          <View style={s.shooterInfo}>
            {user.equipment?.gun_manufacturer || user.weapon_type ? (
              <>
                <Text style={s.shooterTitle}>{user.equipment?.gun_manufacturer ? `${user.equipment.gun_manufacturer} ${user.equipment.gun_model || ''}`.trim() : user.weapon_type}</Text>
                <Text style={s.shooterSub}>
                  {user.national_id || user.id_number ? 'פרטי יורה מולאו' : 'השלם פרטי יורה'} · לחץ לעריכה
                </Text>
              </>
            ) : (
              <>
                <Text style={s.shooterTitle}>מילוי פרטי יורה וציוד</Text>
                <Text style={s.shooterSub}>אקדח, מחסניות, נרתיקים וציוד</Text>
              </>
            )}
          </View>
          <View style={s.shooterIcon}>
            <Ionicons name="shield-checkmark" size={22} color={C.white} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Text style={s.logoutText}>התנתקות</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: C.black,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 26, fontWeight: '800', color: C.white },
  name: { fontSize: 22, fontWeight: '800', color: C.text },
  phone: { fontSize: 14, color: C.muted, marginTop: 2 },

  levelBadgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  levelBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.black,
    justifyContent: 'center', alignItems: 'center',
  },
  levelBadgeNum: { fontSize: 14, fontWeight: '800', color: C.white },
  levelBadgeName: { fontSize: 14, fontWeight: '700', color: C.text },

  statsRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: C.cardAlt, borderRadius: 10,
    padding: 16, alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 4 },

  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  editBtn: { fontSize: 14, color: C.muted, textDecorationLine: 'underline' },
  saveBtn: { fontSize: 14, color: C.black, fontWeight: '700' },

  fieldCard: {
    backgroundColor: C.cardAlt,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
  },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: C.muted, textAlign: 'right', marginBottom: 4 },
  fieldValue: { fontSize: 15, color: C.text, textAlign: 'right' },
  fieldInput: {
    fontSize: 15, color: C.text,
    backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 8, padding: 10,
  },

  cancelEditBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  cancelEditText: { fontSize: 13, color: C.muted, textDecorationLine: 'underline' },

  logoutBtn: {
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.err,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: C.err },

  shooterCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 14,
  },
  shooterInfo: { flex: 1, alignItems: 'flex-end' },
  shooterTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  shooterSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  shooterIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.black, alignItems: 'center', justifyContent: 'center' },
});
