import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, tabIcon, ICON_SETS } from '../../src/context/ThemeContext';
import { PALETTES } from '../../src/constants/theme';
import { logout, deleteAccount } from '../../src/services/auth';

const CAL_VIEW_KEY = 'elad_calendar_view';
const CAL_VIEWS = [
  { id: 'month', label: 'חודשי', icon: 'calendar' },
  { id: 'week', label: 'שבועי', icon: 'calendar-outline' },
  { id: 'day', label: 'יומי', icon: 'today' },
];

export default function SettingsScreen() {
  const { C, paletteId, setPalette, iconSet, setIconSet } = useTheme();
  const s = makeStyles(C);
  const insets = useSafeAreaInsets();
  const [calView, setCalView] = useState('month');
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      try { const v = await AsyncStorage.getItem(CAL_VIEW_KEY); if (v) setCalView(v); } catch {}
    })();
  }, []));

  const chooseCalView = async (id) => {
    setCalView(id);
    try { await AsyncStorage.setItem(CAL_VIEW_KEY, id); } catch {}
  };

  const handleLogout = () => {
    Alert.alert('התנתקות', 'להתנתק מהחשבון במכשיר הזה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'התנתקות',
        style: 'destructive',
        onPress: async () => { await logout(); router.replace('/login'); },
      },
    ]);
  };

  // Two-step confirmation — deletion is irreversible, so a single mis-tap
  // must never be enough.
  const handleDeleteAccount = () => {
    Alert.alert(
      'מחיקת חשבון',
      'הפעולה תמחק את הפרטים האישיים שלך: תעודת זהות, פרטי רישיון הנשק, פרטי הכלי ופרטי הקשר. ' +
      'לא תוכל להתחבר לחשבון הזה שוב.\n\n' +
      'רישומי תשלומים וחשבוניות יישמרו כפי שהחוק מחייב.',
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'להמשיך', style: 'destructive', onPress: confirmDeleteAccount },
      ],
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert('אישור אחרון', 'למחוק את החשבון? אי אפשר לבטל את זה.', [
      { text: 'לא למחוק', style: 'cancel' },
      {
        text: 'כן, למחוק',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteAccount();
            router.replace('/login');
          } catch (e) {
            Alert.alert('המחיקה נכשלה', e.message);
          } finally { setDeleting(false); }
        },
      },
    ]);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingTop: insets.top + 12 }]}>
      <Text style={s.title}>הגדרות</Text>

      {/* Account */}
      <Text style={s.sectionTitle}>החשבון שלי</Text>
      <View style={s.group}>
        <SettingsRow C={C} iconSet={iconSet} iconKey="license" label="רישיון נשק"
          note="סטטוס, תוקף ותזכורות חידוש" onPress={() => router.push('/(tabs)/license')} />
        <View style={s.divider} />
        <SettingsRow C={C} iconSet={iconSet} iconKey="person" label="פרטים אישיים"
          note="שם, אימייל ויום אימון מועדף" onPress={() => router.push('/(tabs)/profile')} />
      </View>

      {/* Calendar default view */}
      <Text style={s.sectionTitle}>תצוגת יומן ברירת מחדל</Text>
      <View style={s.optionRow}>
        {CAL_VIEWS.map(v => {
          const active = calView === v.id;
          return (
            <TouchableOpacity key={v.id} style={[s.optionCard, active && s.optionCardActive]}
              onPress={() => chooseCalView(v.id)} activeOpacity={0.7}>
              <Ionicons name={v.icon} size={22} color={active ? C.white : C.text} />
              <Text style={[s.optionLabel, active && s.optionLabelActive]}>{v.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Icon set */}
      <Text style={s.sectionTitle}>סגנון אייקונים בתפריט</Text>
      <View style={s.optionRow}>
        {Object.keys(ICON_SETS).map(key => {
          const set = ICON_SETS[key];
          const active = iconSet === key;
          return (
            <TouchableOpacity key={key} style={[s.optionCard, active && s.optionCardActive]}
              onPress={() => setIconSet(key)} activeOpacity={0.7}>
              <View style={s.iconPreview}>
                <Ionicons name={set.calendar} size={19} color={active ? C.white : C.text} />
                <Ionicons name={set.person} size={19} color={active ? C.white : C.text} />
              </View>
              <Text style={[s.optionLabel, active && s.optionLabelActive]}>{set.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Color theme */}
      <Text style={s.sectionTitle}>ערכת צבעים</Text>
      <View style={s.optionRow}>
        {PALETTES.map(p => {
          const active = paletteId === p.id;
          return (
            <TouchableOpacity key={p.id} style={[s.paletteCard, active && s.optionCardActive]}
              onPress={() => setPalette(p.id)} activeOpacity={0.7}>
              <View style={[s.swatch, { backgroundColor: p.swatch }]}>
                {active && <Ionicons name="checkmark" size={18} color={C.white} />}
              </View>
              <Text style={[s.optionLabel, active && s.optionLabelActive]}>{p.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Privacy */}
      <Text style={s.sectionTitle}>פרטיות</Text>
      <View style={s.group}>
        <SettingsRow C={C} iconSet={iconSet} iconKey="license" label="מדיניות פרטיות"
          note="אילו נתונים נאספים ולמה" onPress={() => router.push('/privacy')} />
        <View style={s.divider} />
        <SettingsRow C={C} iconSet={iconSet} iconKey="license" label="תקנון"
          note="תנאי השתתפות, תשלומים וביטולים" onPress={() => router.push('/terms')} />
      </View>

      {/* Account actions — destructive, kept last and visually separated */}
      <Text style={s.sectionTitle}>יציאה ומחיקה</Text>
      <View style={s.group}>
        <TouchableOpacity style={s.dangerRow} onPress={handleLogout} activeOpacity={0.6}>
          <Text style={s.logoutText}>התנתקות</Text>
        </TouchableOpacity>
        <View style={s.divider} />
        <TouchableOpacity
          style={s.dangerRow}
          onPress={handleDeleteAccount}
          disabled={deleting}
          activeOpacity={0.6}
        >
          {deleting
            ? <ActivityIndicator size="small" color={C.err} />
            : <Text style={s.deleteText}>מחיקת החשבון שלי</Text>}
        </TouchableOpacity>
      </View>
      <Text style={s.dangerHint}>
        מחיקת החשבון מוחקת את הפרטים האישיים שלך ואינה ניתנת לביטול.
      </Text>

      <Text style={s.hint}>ההגדרות נשמרות במכשיר הזה</Text>
    </ScrollView>
  );
}

function SettingsRow({ C, iconSet, iconKey, label, note, onPress }) {
  const s = makeStyles(C);
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.6}>
      <Ionicons name="chevron-back" size={18} color={C.mutedLt} />
      <View style={s.rowContent}>
        <Text style={s.rowLabel}>{label}</Text>
        {note ? <Text style={s.rowNote}>{note}</Text> : null}
      </View>
      <View style={s.rowIcon}>
        <Ionicons name={tabIcon(iconKey, iconSet, true)} size={20} color={C.text} />
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 50 },
  title: { fontSize: 24, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.muted, textAlign: 'right', marginBottom: 10, marginTop: 22 },

  group: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  rowIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.cardAlt, justifyContent: 'center', alignItems: 'center' },
  rowContent: { flex: 1, alignItems: 'flex-end' },
  rowLabel: { fontSize: 15, fontWeight: '700', color: C.text },
  rowNote: { fontSize: 12, color: C.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: C.borderLt, marginHorizontal: 16 },

  optionRow: { flexDirection: 'row-reverse', gap: 10 },
  optionCard: {
    flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingVertical: 16, alignItems: 'center', gap: 8,
  },
  optionCardActive: { backgroundColor: C.black, borderColor: C.black },
  optionLabel: { fontSize: 13, fontWeight: '700', color: C.text },
  optionLabelActive: { color: C.white },
  iconPreview: { flexDirection: 'row', gap: 6, height: 22, alignItems: 'center' },

  paletteCard: {
    flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', gap: 8,
  },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  hint: { fontSize: 12, color: C.mutedLt, textAlign: 'center', marginTop: 24 },
  // 52pt tall — comfortably above Apple's 44pt minimum touch target
  dangerRow: { paddingVertical: 16, paddingHorizontal: 16, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  logoutText: { fontSize: 15, fontWeight: '700', color: C.text },
  deleteText: { fontSize: 15, fontWeight: '700', color: C.err },
  dangerHint: { fontSize: 12, color: C.mutedLt, textAlign: 'center', marginTop: 8, lineHeight: 17 },
});
