import { useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { Text, TextInput } from '../../src/components/ScaledText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUser, refreshMe, updateProfile, logout } from '../../src/services/auth';
import { getUserLevel } from '../../src/constants/levels';
import { useTheme } from '../../src/context/ThemeContext';

/**
 * שני כלי ההתאמה חיים באתר ונפתחים בדפדפן החיצוני — 31/08/2026.
 *
 * הם לא נבנו לתוך האפליקציה בכוונה. אפל דחתה אותנו ארבע פעמים על
 * הנחיה 1.1.3 (רכישת נשק וחלקי נשק בתוך האפליקציה), ופסלה אפילו
 * נרתיקים כ"חלקי נשק". שאלון שממליץ איזה אקדח או איזו כוונת לקנות
 * הוא המלצת רכישה מובהקת, ובתוך האפליקציה הוא דחייה מובטחת.
 *
 * ⚠️ אין להטמיע את השאלונים במסך פנימי ואין לפתוח אותם ב-WebView.
 * קישור שיוצא לדפדפן הוא הצורה היחידה שאפל אישרה במפורש.
 */
const GUIDE_LINKS = [
  {
    key: 'pistols',
    url: 'https://eladlotar.com/pistols/',
    icon: 'help-circle-outline',
    title: 'שאלון התאמת אקדח',
    sub: '11 שאלות · מדריך מקצועי באתר',
  },
  {
    key: 'optics',
    url: 'https://eladlotar.com/optics/',
    icon: 'radio-button-on-outline',
    title: 'שאלון התאמת כוונת השלכה',
    sub: 'מותאם לתבנית ההרכבה של האקדח שלך',
  },
];

// Preferred training day — the server stores an English enum
// (Customer.preferred_training_day: sunday..saturday) and returns it as
// preferred_day. Display Hebrew, store English.
const TRAINING_DAYS = [
  { value: 'sunday', label: 'ראשון' },
  { value: 'monday', label: 'שני' },
  { value: 'tuesday', label: 'שלישי' },
  { value: 'wednesday', label: 'רביעי' },
  { value: 'thursday', label: 'חמישי' },
  { value: 'friday', label: 'שישי' },
  { value: 'saturday', label: 'שבת' },
];

// Accepts an English enum value (or a legacy Hebrew label) → enum value or ''.
function normalizeDay(v) {
  if (!v) return '';
  const raw = String(v).trim().toLowerCase();
  const byValue = TRAINING_DAYS.find(d => d.value === raw);
  if (byValue) return byValue.value;
  const byLabel = TRAINING_DAYS.find(d => d.label === String(v).trim());
  return byLabel ? byLabel.value : '';
}

function dayLabel(value) {
  return TRAINING_DAYS.find(d => d.value === value)?.label || null;
}

export default function ProfileScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDay, setEditDay] = useState('');

  const applyUser = (u) => {
    setUser(u);
    if (u) {
      setEditName(u.full_name || '');
      setEditEmail(u.email || '');
      setEditDay(normalizeDay(u.preferred_day));
    }
  };

  const loadData = async () => {
    // Paint from the cached user first. Waiting for refreshMe() before the
    // first setUser left the screen blank for up to the 15s request timeout
    // on a weak connection — at the range, that is most of the time.
    const cached = await getUser();
    if (cached) applyUser(cached);
    try {
      const fresh = await refreshMe();
      if (fresh) applyUser(fresh);
    } catch {}
    setLoaded(true);
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
    setSaving(true);
    try {
      const payload = {
        full_name: editName.trim(),
        email: editEmail.trim(),
      };
      // The server writes preferred_day into an enum field — omit it entirely
      // when nothing is selected (an empty string would fail validation).
      if (editDay) payload.preferred_day = editDay;
      const updated = await updateProfile(payload);
      setUser(updated);
      setEditing(false);
      Alert.alert('נשמר', 'הפרטים עודכנו במערכת');
    } catch (e) {
      Alert.alert('שגיאה', e.message);
    } finally {
      setSaving(false);
    }
  };

  /** יציאה לדפדפן החיצוני. לא להחליף ב-WebView ולא במסך פנימי. */
  const openGuide = async (url) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('לא ניתן לפתוח את הדפדפן', url);
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

  // Never a blank screen: spinner while loading, a clear message if we ended
  // up with nothing to show.
  if (!user) {
    return (
      <View style={[s.container, s.centered]}>
        {loaded ? (
          <>
            <Ionicons name="cloud-offline-outline" size={38} color={C.mutedLt} />
            <Text style={s.emptyTitle}>לא הצלחנו לטעון את הפרופיל</Text>
            <TouchableOpacity style={s.retryBtn} onPress={loadData} activeOpacity={0.7}>
              <Text style={s.retryBtnText}>נסה שוב</Text>
            </TouchableOpacity>
          </>
        ) : (
          <ActivityIndicator size="large" color={C.black} />
        )}
      </View>
    );
  }

  const initials = (user.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2);
  const totalBullets = user.total_bullets || 0;
  const totalSessions = user.total_sessions || 0;
  const levelInfo = getUserLevel(totalBullets, totalSessions);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, {
        paddingTop: insets.top + 12,
        // סרגל הלשוניות מרחף מעל התוכן: 57 פיקסלים לסרגל, 24 לכפתור
        // הבית שבולט מעליו, ועוד אוויר. ריווח קבוע של 40 היה קטן
        // מהסרגל עצמו, ולכן הכרטיס האחרון בכל מסך נחתך מתחתיו.
        paddingBottom: insets.bottom + 96,
      }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
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
            <TouchableOpacity
              onPress={() => setEditing(true)}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            >
              <Text style={s.editBtn}>עריכה</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            >
              {saving
                ? <ActivityIndicator size="small" color={C.black} />
                : <Text style={s.saveBtn}>שמירה</Text>}
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
            <View style={s.dayChips}>
              {TRAINING_DAYS.map(d => {
                const active = editDay === d.value;
                return (
                  <TouchableOpacity
                    key={d.value}
                    style={[s.dayChip, active && s.dayChipActive]}
                    onPress={() => setEditDay(active ? '' : d.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.dayChipText, active && s.dayChipTextActive]}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={s.fieldValue}>{dayLabel(normalizeDay(user.preferred_day)) || 'לא נבחר'}</Text>
          )}
        </View>

        {editing && (
          <TouchableOpacity
            style={s.cancelEditBtn}
            onPress={() => {
              setEditing(false);
              setEditName(user.full_name || '');
              setEditEmail(user.email || '');
              setEditDay(normalizeDay(user.preferred_day));
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

      {/* כלי התאמה — קישורים בלבד, נפתחים בדפדפן. ראה ההערה בראש הקובץ. */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>כלי התאמה</Text>
        {GUIDE_LINKS.map((g, i) => (
          <TouchableOpacity
            key={g.key}
            style={[s.guideCard, i > 0 && s.guideCardGap]}
            onPress={() => openGuide(g.url)}
            activeOpacity={0.7}
          >
            <Ionicons name="open-outline" size={17} color={C.mutedLt} />
            <View style={s.guideInfo}>
              <Text style={s.guideTitle}>{g.title}</Text>
              <Text style={s.guideSub}>{g.sub}</Text>
            </View>
            <View style={s.guideIcon}>
              <Ionicons name={g.icon} size={21} color={C.white} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Text style={s.logoutText}>התנתקות</Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28 },
  emptyTitle: { fontSize: 15.5, fontWeight: '700', color: C.text, textAlign: 'center' },
  retryBtn: { backgroundColor: C.black, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 28 },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: C.white },
  content: { padding: 20, paddingBottom: 40 },

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

  dayChips: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  dayChipActive: { backgroundColor: C.black, borderColor: C.black },
  dayChipText: { fontSize: 13, fontWeight: '600', color: C.text },
  dayChipTextActive: { color: C.white },

  cancelEditBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  cancelEditText: { fontSize: 13, color: C.muted, textDecorationLine: 'underline' },

  guideCard: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  guideCardGap: { marginTop: 10 },
  guideInfo: { flex: 1 },
  guideTitle: { fontSize: 15, fontWeight: '700', color: C.text, textAlign: 'right' },
  guideSub: { fontSize: 12, color: C.textSecondary, textAlign: 'right', marginTop: 2, lineHeight: 17 },
  guideIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.black,
    alignItems: 'center', justifyContent: 'center',
  },
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
