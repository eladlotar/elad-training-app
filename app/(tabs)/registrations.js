import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMyEnrollments, cancelEnrollment } from '../../src/services/sessions';
import { useTheme } from '../../src/context/ThemeContext';

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function RegistrationsScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);
  const [enrollments, setEnrollments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const enr = await getMyEnrollments();
      setEnrollments(enr);
    } catch {}
    setLoaded(true);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
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
          onPress: async () => {
            try {
              await cancelEnrollment(enrollment.id);
              await loadData();
            } catch (e) {
              Alert.alert('שגיאה', e.message);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.black} />}
    >
      <Text style={s.title}>ההרשמות שלי</Text>

      {loaded && enrollments.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="calendar-outline" size={32} color={C.mutedLt} />
          <Text style={s.emptyText}>אין הרשמות פעילות</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/sessions')}>
            <Text style={s.emptyLink}>לקביעת אימון</Text>
          </TouchableOpacity>
        </View>
      ) : (
        enrollments.map(e => {
          const d = e.session_date ? new Date(e.session_date) : null;
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
                {e.can_cancel ? (
                  <TouchableOpacity style={s.cancelBtn} onPress={() => handleCancel(e)} activeOpacity={0.7}>
                    <Text style={s.cancelBtnText}>ביטול רישום</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={s.noCancelText}>לא ניתן לבטל — קרוב למועד האימון</Text>
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
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
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

  cancelBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.err,
  },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: C.err },
  noCancelText: { fontSize: 11, color: C.mutedLt, marginTop: 10 },
});
