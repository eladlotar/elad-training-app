import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getUser } from '../../src/services/auth';
import { getSessions, enrollInSession } from '../../src/services/sessions';
import { C } from '../../src/constants/theme';

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function SessionsScreen() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enrolling, setEnrolling] = useState(null);
  const [user, setUser] = useState(null);

  const loadData = async () => {
    try {
      const u = await getUser();
      setUser(u);
      const data = await getSessions();
      setSessions(data);
    } catch (e) {
      console.log('Error loading sessions:', e.message);
    } finally {
      setLoading(false);
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

  const handleEnroll = async (session) => {
    if (session.status === 'full') {
      Alert.alert('האימון מלא', 'אין מקומות פנויים באימון הזה');
      return;
    }

    if (!user?.id) {
      Alert.alert('שגיאה', 'נא להתחבר מחדש');
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
              await enrollInSession(user.id, session.id);
              Alert.alert(
                'נרשמת בהצלחה!',
                `${session.title}\n${formatDate(session.date)} בשעה ${session.start_time}`
              );
              // Reload sessions to get updated counts
              await loadData();
            } catch (e) {
              Alert.alert('שגיאה', e.message || 'לא הצלחנו לרשום אותך, נסה שוב');
            } finally {
              setEnrolling(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.gold} />
      </View>
    );
  }

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

      {sessions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>אין אימונים פתוחים כרגע</Text>
          <Text style={styles.emptySubtext}>משוך למטה לרענון</Text>
        </View>
      ) : (
        sessions.map(session => {
          const isFull = session.status === 'full';
          const spotsLeft = session.max_participants - session.enrolled_count;
          const isEnrolling = enrolling === session.id;
          const date = new Date(session.date);
          const dayName = DAY_NAMES[date.getDay()];

          return (
            <View key={session.id} style={[styles.card, isFull && styles.cardFull]}>
              <View style={styles.cardTop}>
                <View style={[styles.dateBadge, isFull && styles.dateBadgeFull]}>
                  <Text style={[styles.dayName, isFull && styles.dayNameFull]}>{dayName}</Text>
                  <Text style={[styles.dateNum, isFull && styles.dateNumFull]}>{date.getDate()}</Text>
                  <Text style={[styles.monthName, isFull && styles.monthNameFull]}>
                    {date.toLocaleDateString('he-IL', { month: 'short' })}
                  </Text>
                </View>

                <View style={styles.cardInfo}>
                  <Text style={styles.sessionTitle}>{session.title}</Text>
                  <Text style={styles.sessionMeta}>{session.start_time} - {session.end_time}</Text>
                  {session.location ? <Text style={styles.sessionMeta}>{session.location}</Text> : null}
                  {session.instructor_name ? <Text style={styles.sessionMeta}>{session.instructor_name}</Text> : null}
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.spotsInfo}>
                  <View style={[
                    styles.spotsDot,
                    isFull ? styles.spotsDotFull : spotsLeft <= 3 ? styles.spotsDotWarn : styles.spotsDotOk
                  ]} />
                  <Text style={[styles.spotsText, isFull && styles.spotsTextFull]}>
                    {isFull ? 'מלא' : `${spotsLeft} מקומות פנויים`}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.enrollBtn, isFull && styles.enrollBtnFull]}
                  onPress={() => handleEnroll(session)}
                  disabled={isFull || isEnrolling}
                >
                  {isEnrolling ? (
                    <ActivityIndicator size="small" color={C.white} />
                  ) : (
                    <Text style={[styles.enrollBtnText, isFull && styles.enrollBtnTextFull]}>
                      {isFull ? 'מלא' : 'הרשמה'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  header: { marginBottom: 20, alignItems: 'flex-end' },
  title: { fontSize: 24, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 2 },

  emptyCard: {
    backgroundColor: C.card, borderRadius: 12, padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  emptyText: { fontSize: 14, fontWeight: '700', color: C.muted },
  emptySubtext: { fontSize: 12, color: C.mutedLt, marginTop: 4 },

  card: {
    backgroundColor: C.card, borderRadius: 14, marginBottom: 12,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  cardFull: { opacity: 0.6 },

  cardTop: { flexDirection: 'row-reverse', padding: 16, gap: 14 },
  dateBadge: {
    width: 58, height: 68, borderRadius: 10, backgroundColor: C.goldLt,
    justifyContent: 'center', alignItems: 'center',
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
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: C.borderLt, backgroundColor: C.cardAlt,
  },
  spotsInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  spotsDot: { width: 8, height: 8, borderRadius: 4 },
  spotsDotOk: { backgroundColor: C.ok },
  spotsDotWarn: { backgroundColor: '#B7791F' },
  spotsDotFull: { backgroundColor: C.err },
  spotsText: { fontSize: 11, fontWeight: '700', color: C.muted },
  spotsTextFull: { color: C.err },

  enrollBtn: { backgroundColor: C.gold, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, minWidth: 70, alignItems: 'center' },
  enrollBtnFull: { backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border },
  enrollBtnText: { fontSize: 13, fontWeight: '800', color: C.white },
  enrollBtnTextFull: { color: C.muted },
});
