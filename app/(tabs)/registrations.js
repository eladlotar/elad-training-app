import { useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { Text } from '../../src/components/ScaledText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMyEnrollments, cancelEnrollment } from '../../src/services/sessions';
import { parseLocalDate } from '../../src/utils/date';
import { useTheme } from '../../src/context/ThemeContext';

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function RegistrationsScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);
  const insets = useSafeAreaInsets();
  const [enrollments, setEnrollments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const enr = await getMyEnrollments();
      setEnrollments(enr || []);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
    setLoaded(true);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Two-stage cancel: first try without acknowledge; when the server answers
  // late_confirm_required, ask the user to explicitly burn the entry.
  const performCancel = async (enrollment, acknowledgeBurn) => {
    try {
      const result = await cancelEnrollment(enrollment.id, { acknowledgeBurn });
      if (result?.late_cancelled) {
        Alert.alert('הביטול נקלט', 'הביטול נקלט. הכניסה נשרפה בהתאם למדיניות.');
      }
      await loadData();
    } catch (e) {
      if (e.error_code === 'late_confirm_required') {
        Alert.alert('ביטול מאוחר', e.message, [
          { text: 'ביטול', style: 'cancel' },
          {
            text: 'בטל בכל זאת',
            style: 'destructive',
            onPress: () => performCancel(enrollment, true),
          },
        ]);
      } else {
        Alert.alert('שגיאה', e.message);
        await loadData();
      }
    }
  };

  const handleCancel = (enrollment) => {
    Alert.alert(
      'ביטול רישום',
      `לבטל את ${enrollment.session_title}?`,
      [
        { text: 'לא', style: 'cancel' },
        {
          text: 'בטל רישום',
          style: 'destructive',
          onPress: () => performCancel(enrollment, false),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, {
        paddingTop: insets.top + 12,
        // סרגל הלשוניות מרחף מעל התוכן: 57 פיקסלים לסרגל, 24 לכפתור
        // הבית שבולט מעליו, ועוד אוויר. ריווח קבוע של 40 היה קטן
        // מהסרגל עצמו, ולכן הכרטיס האחרון בכל מסך נחתך מתחתיו.
        paddingBottom: insets.bottom + 96,
      }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.black} />}
    >
      <Text style={s.title}>ההרשמות שלי</Text>

      {/* Fetch failed and there is nothing to show → error + retry (not "empty") */}
      {loaded && loadError && enrollments.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="cloud-offline-outline" size={32} color={C.mutedLt} />
          <Text style={s.emptyText}>לא הצלחנו לטעון את ההרשמות</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadData} activeOpacity={0.7}>
            <Text style={s.retryBtnText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      ) : loaded && enrollments.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="calendar-outline" size={32} color={C.mutedLt} />
          <Text style={s.emptyText}>אין הרשמות פעילות</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/sessions')}>
            <Text style={s.emptyLink}>לקביעת אימון</Text>
          </TouchableOpacity>
        </View>
      ) : (
        enrollments.map(e => {
          const d = parseLocalDate(e.session_date);
          return (
            <View key={e.id} style={s.card}>
              <View style={s.cardDate}>
                <Text style={s.cardDay}>{d ? d.getDate() : '-'}</Text>
                <Text style={s.cardMonth}>
                  {d ? d.toLocaleDateString('he-IL', { month: 'short' }) : ''}
                </Text>
              </View>
              <View style={s.cardContent}>
                <Text style={s.cardTitle}>{e.session_title}</Text>
                <Text style={s.cardMeta}>
                  {d ? `יום ${DAY_NAMES[d.getDay()]}` : ''} | {e.session_time || ''}
                </Text>
                {e.session_location ? <Text style={s.cardMeta}>{e.session_location}</Text> : null}
                {/* כמות הכדורים שנקבעה לאימון — מוצגת רק כשיש ערך */}
                {e.session_ammo > 0 ? (
                  <View style={s.ammoRow}>
                    <Text style={s.ammoValue}>{e.session_ammo}</Text>
                    <Text style={s.ammoLabel}>כדורים באימון</Text>
                  </View>
                ) : null}
                {e.session_notes ? (
                  <Text style={s.cardNotes} numberOfLines={3}>{e.session_notes}</Text>
                ) : null}
                {e.cancel_mode === 'started' ? (
                  <Text style={s.noCancelText}>האימון התחיל</Text>
                ) : e.cancel_mode === 'late' ? (
                  <>
                    <TouchableOpacity style={[s.cancelBtn, s.lateBtn]} onPress={() => handleCancel(e)} activeOpacity={0.7}>
                      <Text style={[s.cancelBtnText, s.lateBtnText]}>ביטול מאוחר</Text>
                    </TouchableOpacity>
                    {e.late_cancel_warning ? (
                      <Text style={s.lateWarnText}>{e.late_cancel_warning}</Text>
                    ) : null}
                  </>
                ) : (
                  <TouchableOpacity style={s.cancelBtn} onPress={() => handleCancel(e)} activeOpacity={0.7}>
                    <Text style={s.cancelBtnText}>ביטול רישום</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 16 },

  emptyCard: {
    backgroundColor: C.cardAlt,
    borderRadius: 14,
    padding: 36,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: { fontSize: 14, color: C.muted },
  emptyLink: { fontSize: 14, color: C.text, fontWeight: '700', textDecorationLine: 'underline' },
  retryBtn: {
    backgroundColor: C.black, borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 10, marginTop: 4,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: C.white },

  card: {
    flexDirection: 'row-reverse',
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardDate: {
    width: 64,
    backgroundColor: C.black,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  cardDay: { fontSize: 24, fontWeight: '800', color: C.white },
  cardMonth: { fontSize: 12, color: C.white, opacity: 0.8 },
  cardContent: { flex: 1, padding: 14, alignItems: 'flex-end' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3 },
  cardMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  ammoRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 5, marginTop: 6 },
  ammoValue: { fontSize: 16, fontWeight: '800', color: C.accent2 },
  ammoLabel: { fontSize: 11, color: C.muted },
  cardNotes: { fontSize: 12, color: C.textSecondary, textAlign: 'right', marginTop: 6, lineHeight: 17 },

  cancelBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.err,
  },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: C.err },
  lateBtn: { borderColor: C.warn },
  lateBtnText: { color: C.warn },
  lateWarnText: { fontSize: 10, color: C.warn, marginTop: 6, textAlign: 'right' },
  noCancelText: { fontSize: 11, color: C.mutedLt, marginTop: 10 },
});
