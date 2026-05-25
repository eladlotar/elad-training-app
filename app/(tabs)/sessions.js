import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getUser } from '../../src/services/auth';
import {
  getSessionsByDate,
  getSessionDates,
  getWeekDays,
  enrollInSession,
  getMyEnrollments,
  cancelEnrollment,
} from '../../src/services/sessions';
import { C } from '../../src/constants/theme';

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function dateToStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function SessionsScreen() {
  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(dateToStr(today));
  const [sessionsByDate, setSessionsByDate] = useState({});
  const [sessionDates, setSessionDates] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [user, setUser] = useState(null);
  const [enrolling, setEnrolling] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const u = await getUser();
    setUser(u);
    setSessionsByDate(getSessionsByDate());
    setSessionDates(getSessionDates());
    if (u?.id) {
      try {
        const enr = await getMyEnrollments(u.id);
        setEnrollments(enr);
      } catch {}
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Calculate week
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekOffset * 7));
  const weekDays = getWeekDays(weekStart);

  const daySessions = sessionsByDate[selectedDate] || [];
  const enrolledSessionIds = new Set(enrollments.map(e => e.session_id));

  const handleEnroll = (session) => {
    if (!user?.id) { Alert.alert('שגיאה', 'יש להתחבר מחדש'); return; }
    const spotsLeft = session.max_participants - session.enrolled_count;
    Alert.alert(
      session.title,
      `${session.start_time} - ${session.end_time}\n${session.location}\n\n${spotsLeft} מקומות פנויים`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'הרשמה',
          onPress: async () => {
            setEnrolling(session.id);
            try {
              await enrollInSession(user.id, session.id);
              Alert.alert('נרשמת!', session.title);
              await loadData();
            } catch (e) {
              Alert.alert('שגיאה', e.message);
            } finally {
              setEnrolling(null);
            }
          },
        },
      ]
    );
  };

  const handleCancel = (enrollment) => {
    Alert.alert(
      'ביטול רישום',
      `לבטל את ${enrollment.session_title}?`,
      [
        { text: 'לא', style: 'cancel' },
        {
          text: 'בטל',
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
      {/* Title */}
      <Text style={s.title}>אימונים</Text>

      {/* Week Navigation */}
      <View style={s.weekNav}>
        <TouchableOpacity onPress={() => setWeekOffset(w => w + 1)} style={s.weekNavBtn}>
          <Text style={s.weekNavText}>{'>'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setWeekOffset(0)}>
          <Text style={s.weekNavTitle}>
            {weekOffset === 0 ? 'השבוע' : weekOffset === 1 ? 'שבוע הבא' : `עוד ${weekOffset} שבועות`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)} style={s.weekNavBtn}>
          <Text style={s.weekNavText}>{'<'}</Text>
        </TouchableOpacity>
      </View>

      {/* Week Strip */}
      <View style={s.weekStrip}>
        {weekDays.map(day => {
          const isSelected = day.date === selectedDate;
          const hasSession = sessionDates.includes(day.date);
          return (
            <TouchableOpacity
              key={day.date}
              style={[s.dayCell, isSelected && s.dayCellSelected, day.isToday && !isSelected && s.dayCellToday]}
              onPress={() => setSelectedDate(day.date)}
              activeOpacity={0.6}
            >
              <Text style={[s.dayName, isSelected && s.dayNameSelected]}>{day.dayName}</Text>
              <Text style={[s.dayNum, isSelected && s.dayNumSelected]}>{day.dayNum}</Text>
              {hasSession && <View style={[s.dot, isSelected && s.dotSelected]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sessions List */}
      <View style={s.sessionsList}>
        {daySessions.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>אין אימונים ביום זה</Text>
          </View>
        ) : (
          daySessions.map(session => {
            const isFull = session.status === 'full' || session.enrolled_count >= session.max_participants;
            const spotsLeft = session.max_participants - session.enrolled_count;
            const isEnrolled = enrolledSessionIds.has(session.id);
            const isLoading = enrolling === session.id;
            const enrollment = enrollments.find(e => e.session_id === session.id);

            return (
              <View key={session.id} style={[s.card, isFull && !isEnrolled && s.cardFull]}>
                {/* Time strip */}
                <View style={s.cardTime}>
                  <Text style={s.timeText}>{session.start_time}</Text>
                  <View style={s.timeLine} />
                  <Text style={[s.timeText, s.timeEnd]}>{session.end_time}</Text>
                </View>

                {/* Content */}
                <View style={s.cardContent}>
                  <Text style={s.cardTitle}>{session.title}</Text>
                  <Text style={s.cardMeta}>{session.location} | {session.instructor_name}</Text>

                  <View style={s.cardFooter}>
                    {/* Spots */}
                    <View style={s.spotsWrap}>
                      <View style={[s.spotsDot, isFull ? s.spotsFull : spotsLeft <= 3 ? s.spotsWarn : s.spotsOk]} />
                      <Text style={s.spotsText}>
                        {isFull ? 'מלא' : `${spotsLeft}/${session.max_participants}`}
                      </Text>
                    </View>

                    {/* Action */}
                    {isEnrolled ? (
                      <TouchableOpacity
                        style={s.cancelBtn}
                        onPress={() => handleCancel(enrollment)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.cancelBtnText}>ביטול</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[s.enrollBtn, isFull && s.enrollBtnFull]}
                        onPress={() => handleEnroll(session)}
                        disabled={isFull || isLoading}
                        activeOpacity={0.7}
                      >
                        {isLoading ? (
                          <ActivityIndicator size="small" color={C.white} />
                        ) : (
                          <Text style={[s.enrollBtnText, isFull && s.enrollBtnTextFull]}>
                            {isFull ? 'מלא' : 'הרשמה'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingTop: 60, paddingBottom: 40 },

  title: { fontSize: 24, fontWeight: '800', color: C.text, textAlign: 'right', paddingHorizontal: 20, marginBottom: 16 },

  // Week nav
  weekNav: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  weekNavBtn: { padding: 8 },
  weekNavText: { fontSize: 18, color: C.text, fontWeight: '600' },
  weekNavTitle: { fontSize: 15, fontWeight: '700', color: C.text },

  // Week strip
  weekStrip: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 12,
    marginBottom: 20,
    gap: 4,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  dayCellSelected: {
    backgroundColor: C.text,
  },
  dayCellToday: {
    backgroundColor: C.cardAlt,
  },
  dayName: { fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 4 },
  dayNameSelected: { color: C.white },
  dayNum: { fontSize: 18, fontWeight: '700', color: C.text },
  dayNumSelected: { color: C.white },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.text, marginTop: 4 },
  dotSelected: { backgroundColor: C.white },

  // Sessions list
  sessionsList: { paddingHorizontal: 20 },
  emptyCard: {
    backgroundColor: C.cardAlt,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: C.muted },

  // Session card
  card: {
    flexDirection: 'row-reverse',
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardFull: { opacity: 0.5 },
  cardTime: {
    width: 56,
    backgroundColor: C.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  timeText: { fontSize: 12, fontWeight: '700', color: C.text },
  timeEnd: { color: C.muted },
  timeLine: { width: 1, height: 14, backgroundColor: C.border, marginVertical: 3 },

  cardContent: { flex: 1, padding: 14, alignItems: 'flex-end' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3 },
  cardMeta: { fontSize: 12, color: C.muted, marginBottom: 10 },

  cardFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  spotsWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  spotsDot: { width: 7, height: 7, borderRadius: 4 },
  spotsOk: { backgroundColor: C.ok },
  spotsWarn: { backgroundColor: C.warn },
  spotsFull: { backgroundColor: C.err },
  spotsText: { fontSize: 11, color: C.muted, fontWeight: '600' },

  enrollBtn: {
    backgroundColor: C.black,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  enrollBtnFull: { backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border },
  enrollBtnText: { fontSize: 13, fontWeight: '700', color: C.white },
  enrollBtnTextFull: { color: C.muted },

  cancelBtn: {
    backgroundColor: C.bg,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.err,
  },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: C.err },
});
