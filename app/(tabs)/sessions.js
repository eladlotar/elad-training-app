import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { getUser } from '../../src/services/auth';
import { C } from '../../src/constants/theme';

// TODO: Replace with real data from Base44
const MOCK_SESSIONS = [
  {
    id: '1',
    title: 'אימון ירי מבצעי',
    type: 'training',
    date: '2026-04-28',
    start_time: '09:00',
    end_time: '11:00',
    location: 'מטווח מרכזי',
    instructor_name: 'יוסי כהן',
    max_participants: 12,
    enrolled_count: 8,
    status: 'open',
  },
  {
    id: '2',
    title: 'קורס הגנה עצמית',
    type: 'course',
    date: '2026-04-29',
    start_time: '17:00',
    end_time: '19:00',
    location: 'אולם אימונים',
    instructor_name: 'דני לוי',
    max_participants: 15,
    enrolled_count: 15,
    status: 'full',
  },
  {
    id: '3',
    title: 'אימון לחימה קרובה',
    type: 'training',
    date: '2026-04-30',
    start_time: '10:00',
    end_time: '12:00',
    location: 'אולם אימונים',
    instructor_name: 'אבי שמש',
    max_participants: 10,
    enrolled_count: 4,
    status: 'open',
  },
];

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function SessionsScreen() {
  const [sessions, setSessions] = useState(MOCK_SESSIONS);
  const [refreshing, setRefreshing] = useState(false);
  const [enrolling, setEnrolling] = useState(null);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch sessions from Base44
    setRefreshing(false);
  };

  const handleEnroll = async (session) => {
    if (session.status === 'full') {
      Alert.alert('האימון מלא', 'אין מקומות פנויים באימון הזה');
      return;
    }

    Alert.alert(
      'אישור רישום',
      `להירשם ל${session.title}?\n${formatDate(session.date)} ${session.start_time}`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'אישור',
          onPress: async () => {
            setEnrolling(session.id);
            try {
              // TODO: Create Enrollment in Base44
              // TODO: Update Session enrolled_count
              // TODO: Sync with Customer record
              Alert.alert('נרשמת בהצלחה!', `${session.title}\n${formatDate(session.date)} בשעה ${session.start_time}`);
              setSessions(prev =>
                prev.map(s =>
                  s.id === session.id
                    ? { ...s, enrolled_count: s.enrolled_count + 1, status: s.enrolled_count + 1 >= s.max_participants ? 'full' : 'open' }
                    : s
                )
              );
            } catch (e) {
              Alert.alert('שגיאה', 'לא הצלחנו לרשום אותך, נסה שוב');
            } finally {
              setEnrolling(null);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.gold} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>אימונים פתוחים</Text>
        <Text style={styles.subtitle}>בחר אימון והירשם</Text>
      </View>

      {sessions.map(session => {
        const isFull = session.status === 'full';
        const spotsLeft = session.max_participants - session.enrolled_count;
        const isEnrolling = enrolling === session.id;
        const date = new Date(session.date);
        const dayName = DAY_NAMES[date.getDay()];

        return (
          <View key={session.id} style={[styles.card, isFull && styles.cardFull]}>
            {/* Date badge */}
            <View style={styles.cardTop}>
              <View style={[styles.dateBadge, isFull && styles.dateBadgeFull]}>
                <Text style={[styles.dayName, isFull && styles.dayNameFull]}>
                  {dayName}
                </Text>
                <Text style={[styles.dateNum, isFull && styles.dateNumFull]}>
                  {date.getDate()}
                </Text>
                <Text style={[styles.monthName, isFull && styles.monthNameFull]}>
                  {date.toLocaleDateString('he-IL', { month: 'short' })}
                </Text>
              </View>

              <View style={styles.cardInfo}>
                <Text style={styles.sessionTitle}>{session.title}</Text>
                <Text style={styles.sessionMeta}>
                  {session.start_time} - {session.end_time}
                </Text>
                <Text style={styles.sessionMeta}>{session.location}</Text>
                <Text style={styles.sessionMeta}>
                  {session.instructor_name}
                </Text>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.spotsInfo}>
                <View style={[styles.spotsDot, isFull ? styles.spotsDotFull : spotsLeft <= 3 ? styles.spotsDotWarn : styles.spotsDotOk]} />
                <Text style={[styles.spotsText, isFull && styles.spotsTextFull]}>
                  {isFull ? 'מלא' : `${spotsLeft} מקומות פנויים`}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.enrollBtn, isFull && styles.enrollBtnFull]}
                onPress={() => handleEnroll(session)}
                disabled={isFull || isEnrolling}
              >
                <Text style={[styles.enrollBtnText, isFull && styles.enrollBtnTextFull]}>
                  {isEnrolling ? 'נרשם...' : isFull ? 'מלא' : 'הרשמה'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 60 },
  header: { marginBottom: 20, alignItems: 'flex-end' },
  title: { fontSize: 24, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 2 },

  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  cardFull: { opacity: 0.6 },

  cardTop: {
    flexDirection: 'row-reverse',
    padding: 16,
    gap: 14,
  },
  dateBadge: {
    width: 58,
    height: 68,
    borderRadius: 10,
    backgroundColor: C.goldLt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBadgeFull: { backgroundColor: C.cardAlt },
  dayName: { fontSize: 10, fontWeight: '700', color: C.goldDark },
  dayNameFull: { color: C.muted },
  dateNum: { fontSize: 22, fontWeight: '800', color: C.goldDark },
  dateNumFull: { color: C.muted },
  monthName: { fontSize: 9, fontWeight: '600', color: C.goldDark },
  monthNameFull: { color: C.muted },

  cardInfo: { flex: 1, alignItems: 'flex-end' },
  sessionTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 4 },
  sessionMeta: { fontSize: 12, color: C.muted, marginTop: 1 },

  cardFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.borderLt,
    backgroundColor: C.cardAlt,
  },
  spotsInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  spotsDot: { width: 8, height: 8, borderRadius: 4 },
  spotsDotOk: { backgroundColor: C.ok },
  spotsDotWarn: { backgroundColor: '#B7791F' },
  spotsDotFull: { backgroundColor: C.err },
  spotsText: { fontSize: 11, fontWeight: '700', color: C.muted },
  spotsTextFull: { color: C.err },

  enrollBtn: {
    backgroundColor: C.gold,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  enrollBtnFull: { backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border },
  enrollBtnText: { fontSize: 13, fontWeight: '800', color: C.white },
  enrollBtnTextFull: { color: C.muted },
});
