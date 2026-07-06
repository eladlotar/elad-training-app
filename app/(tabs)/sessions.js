import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUser } from '../../src/services/auth';
import {
  getSessions,
  getSessionsByDate,
  getSessionDates,
  enrollInSession,
  getMyEnrollments,
  cancelEnrollment,
} from '../../src/services/sessions';
import { useTheme } from '../../src/context/ThemeContext';

const VIEW_PREF_KEY = 'elad_calendar_view'; // per-user default view
const HEB_DAYS_SHORT = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const HEB_DAYS_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HEB_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function dateToStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseStr(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

export default function SessionsScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);
  const today = new Date();
  const todayStr = dateToStr(today);

  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day' — monthly default
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [weekAnchor, setWeekAnchor] = useState(todayStr);

  const [sessionsByDate, setSessionsByDate] = useState({});
  const [sessionDates, setSessionDates] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [user, setUser] = useState(null);
  const [enrolling, setEnrolling] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const u = await getUser();
    setUser(u);
    // Restore this user's preferred default view (once)
    try {
      const pref = await AsyncStorage.getItem(VIEW_PREF_KEY);
      if (pref === 'month' || pref === 'week' || pref === 'day') setViewMode(pref);
    } catch {}
    try {
      await getSessions();
    } catch (e) {
      Alert.alert('שגיאה בטעינת אימונים', e.message);
    }
    setSessionsByDate(getSessionsByDate());
    setSessionDates(getSessionDates());
    if (u?.id) {
      try { setEnrollments(await getMyEnrollments()); } catch {}
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const changeView = async (mode) => {
    setViewMode(mode);
    try { await AsyncStorage.setItem(VIEW_PREF_KEY, mode); } catch {}
    // keep the month/week in sync with the currently-selected day
    const d = parseStr(selectedDate);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setWeekAnchor(selectedDate);
  };

  const sessionDateSet = useMemo(() => new Set(sessionDates), [sessionDates]);
  const daySessions = sessionsByDate[selectedDate] || [];
  const enrolledSessionIds = new Set(enrollments.map(e => e.session_id));

  const BLOCK_MSG = {
    profile_incomplete: 'יש להשלים פרטי יורה (ת"ז, רישיון, מספר כלי) לפני הרשמה.',
    no_product: 'אין לך מנוי או מוצר שמתאים לאימון הזה. לפרטים פנה אלינו.',
    no_credit: 'נגמרו הקרדיטים במנוי שלך. לחידוש פנה אלינו.',
    inactive: 'החשבון אינו פעיל כרגע. פנה אלינו.',
    full: 'האימון מלא.',
  };

  const handleEnroll = (session) => {
    if (!user?.id) { Alert.alert('שגיאה', 'יש להתחבר מחדש'); return; }

    // Explain the block up-front instead of a mysterious server error
    if (session.block_reason && BLOCK_MSG[session.block_reason]) {
      if (session.block_reason === 'profile_incomplete') {
        Alert.alert('נדרשת השלמת פרטים', BLOCK_MSG.profile_incomplete, [
          { text: 'לא עכשיו', style: 'cancel' },
          { text: 'להשלמת פרטים', onPress: () => router.push('/(tabs)/shooter') },
        ]);
      } else {
        Alert.alert('לא ניתן להירשם', BLOCK_MSG[session.block_reason]);
      }
      return;
    }

    Alert.alert(
      session.title,
      `${session.start_time} - ${session.end_time}${session.location ? '\n' + session.location : ''}`,
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
              // Map a server block_reason if present, else show the message
              const msg = BLOCK_MSG[e.error_code] || e.message;
              Alert.alert('לא ניתן להירשם', msg);
            } finally { setEnrolling(null); }
          },
        },
      ]
    );
  };

  const handleCancel = (enrollment) => {
    Alert.alert('ביטול רישום', `לבטל את ${enrollment.session_title}?`, [
      { text: 'לא', style: 'cancel' },
      {
        text: 'בטל', style: 'destructive',
        onPress: async () => {
          try { await cancelEnrollment(enrollment.id); await loadData(); }
          catch (e) { Alert.alert('שגיאה', e.message); }
        },
      },
    ]);
  };

  // ── Month grid ──────────────────────────────────────────────────────────
  const monthGrid = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startPad = first.getDay(); // 0=Sunday
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(dateToStr(new Date(viewYear, viewMonth, d)));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); };

  // ── Week strip ──────────────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    const anchor = parseStr(weekAnchor);
    const sunday = addDays(anchor, -anchor.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(sunday, i);
      const ds = dateToStr(d);
      return { date: ds, dayName: HEB_DAYS_SHORT[d.getDay()], dayNum: d.getDate(), isToday: ds === todayStr };
    });
  }, [weekAnchor, todayStr]);

  const weekLabel = useMemo(() => {
    const anchor = parseStr(weekAnchor);
    const sunday = addDays(anchor, -anchor.getDay());
    const sat = addDays(sunday, 6);
    return `${sunday.getDate()} ${HEB_MONTHS[sunday.getMonth()].slice(0, 3)}׳ – ${sat.getDate()} ${HEB_MONTHS[sat.getMonth()].slice(0, 3)}׳`;
  }, [weekAnchor]);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.black} />}
    >
      <Text style={s.title}>אימונים</Text>

      {/* View selector — monthly / weekly / daily */}
      <View style={s.segment}>
        {[['month', 'חודשי'], ['week', 'שבועי'], ['day', 'יומי']].map(([mode, label]) => (
          <TouchableOpacity
            key={mode}
            style={[s.segmentBtn, viewMode === mode && s.segmentBtnActive]}
            onPress={() => changeView(mode)}
            activeOpacity={0.7}
          >
            <Text style={[s.segmentText, viewMode === mode && s.segmentTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── MONTH VIEW ── */}
      {viewMode === 'month' && (
        <View style={s.monthWrap}>
          <View style={s.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={s.navBtn}><Ionicons name="chevron-forward" size={20} color={C.text} /></TouchableOpacity>
            <Text style={s.monthTitle}>{HEB_MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={s.navBtn}><Ionicons name="chevron-back" size={20} color={C.text} /></TouchableOpacity>
          </View>
          <View style={s.weekHeader}>
            {HEB_DAYS_SHORT.map((d, i) => <Text key={i} style={s.weekHeaderCell}>{d}</Text>)}
          </View>
          <View style={s.monthGrid}>
            {monthGrid.map((ds, i) => {
              if (!ds) return <View key={i} style={s.monthCell} />;
              const isSel = ds === selectedDate;
              const isToday = ds === todayStr;
              const hasSession = sessionDateSet.has(ds);
              return (
                <TouchableOpacity key={i} style={s.monthCell} onPress={() => setSelectedDate(ds)} activeOpacity={0.6}>
                  <View style={[s.monthDayInner, isSel && s.monthDaySel, isToday && !isSel && s.monthDayToday]}>
                    <Text style={[s.monthDayNum, isSel && s.monthDayNumSel]}>{parseStr(ds).getDate()}</Text>
                  </View>
                  {hasSession && <View style={[s.monthDot, isSel && s.monthDotSel]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ── WEEK VIEW ── */}
      {viewMode === 'week' && (
        <>
          <View style={s.rowNav}>
            <TouchableOpacity onPress={() => setWeekAnchor(dateToStr(addDays(parseStr(weekAnchor), 7)))} style={s.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={C.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setWeekAnchor(todayStr)}><Text style={s.rowNavTitle}>{weekLabel}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setWeekAnchor(dateToStr(addDays(parseStr(weekAnchor), -7)))} style={s.navBtn}>
              <Ionicons name="chevron-back" size={20} color={C.text} />
            </TouchableOpacity>
          </View>
          <View style={s.weekStrip}>
            {weekDays.map(day => {
              const isSel = day.date === selectedDate;
              const hasSession = sessionDateSet.has(day.date);
              return (
                <TouchableOpacity
                  key={day.date}
                  style={[s.dayCell, isSel && s.dayCellSelected, day.isToday && !isSel && s.dayCellToday]}
                  onPress={() => setSelectedDate(day.date)} activeOpacity={0.6}
                >
                  <Text style={[s.dayName, isSel && s.dayNameSelected]}>{day.dayName}</Text>
                  <Text style={[s.dayNum, isSel && s.dayNumSelected]}>{day.dayNum}</Text>
                  {hasSession && <View style={[s.dot, isSel && s.dotSelected]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* ── DAY VIEW ── */}
      {viewMode === 'day' && (
        <View style={s.rowNav}>
          <TouchableOpacity onPress={() => setSelectedDate(dateToStr(addDays(parseStr(selectedDate), 1)))} style={s.navBtn}>
            <Ionicons name="chevron-forward" size={22} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedDate(todayStr)}>
            <Text style={s.dayViewTitle}>
              {selectedDate === todayStr ? 'היום' : `יום ${HEB_DAYS_FULL[parseStr(selectedDate).getDay()]}`}
            </Text>
            <Text style={s.dayViewSub}>
              {parseStr(selectedDate).getDate()} ב{HEB_MONTHS[parseStr(selectedDate).getMonth()]}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedDate(dateToStr(addDays(parseStr(selectedDate), -1)))} style={s.navBtn}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── SESSIONS LIST (shared) ── */}
      <View style={s.sessionsList}>
        {viewMode !== 'day' && (
          <Text style={s.listDateLabel}>
            {selectedDate === todayStr ? 'היום' : `יום ${HEB_DAYS_FULL[parseStr(selectedDate).getDay()]}, ${parseStr(selectedDate).getDate()} ב${HEB_MONTHS[parseStr(selectedDate).getMonth()]}`}
          </Text>
        )}
        {daySessions.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="calendar-outline" size={28} color={C.mutedLt} />
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
                <View style={s.cardTime}>
                  <Text style={s.timeText}>{session.start_time}</Text>
                  <View style={s.timeLine} />
                  <Text style={[s.timeText, s.timeEnd]}>{session.end_time}</Text>
                </View>
                <View style={s.cardContent}>
                  <Text style={s.cardTitle}>{session.title}</Text>
                  <Text style={s.cardMeta}>{session.location} | {session.instructor_name}</Text>
                  <View style={s.cardFooter}>
                    <View style={s.spotsWrap}>
                      {(isFull || spotsLeft <= 2) && (
                        <View style={[s.spotsDot, isFull ? s.spotsFull : s.spotsWarn]} />
                      )}
                      <Text style={s.spotsText}>
                        {isFull ? 'מלא' : spotsLeft === 1 ? 'מקום אחרון!' : spotsLeft === 2 ? 'נשארו 2 מקומות' : ''}
                      </Text>
                    </View>
                    {isEnrolled ? (
                      <TouchableOpacity style={s.cancelBtn} onPress={() => handleCancel(enrollment)} activeOpacity={0.7}>
                        <Text style={s.cancelBtnText}>ביטול</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[s.enrollBtn, isFull && s.enrollBtnFull]}
                        onPress={() => handleEnroll(session)}
                        disabled={isFull || isLoading} activeOpacity={0.7}
                      >
                        {isLoading ? <ActivityIndicator size="small" color={C.white} />
                          : <Text style={[s.enrollBtnText, isFull && s.enrollBtnTextFull]}>{isFull ? 'מלא' : 'הרשמה'}</Text>}
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

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: C.text, textAlign: 'right', paddingHorizontal: 20, marginBottom: 16 },

  // Segmented view selector
  segment: {
    flexDirection: 'row-reverse',
    marginHorizontal: 20,
    marginBottom: 18,
    backgroundColor: C.cardAlt,
    borderRadius: 10,
    padding: 3,
  },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: C.black },
  segmentText: { fontSize: 13, fontWeight: '700', color: C.muted },
  segmentTextActive: { color: C.white },

  // Generic prev/next nav row
  rowNav: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  rowNavTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  navBtn: { padding: 6 },

  // Month
  monthWrap: { paddingHorizontal: 16, marginBottom: 6 },
  monthNav: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 12 },
  monthTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  weekHeader: { flexDirection: 'row-reverse', marginBottom: 6 },
  weekHeaderCell: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: C.mutedLt },
  monthGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
  monthCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  monthDayInner: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  monthDaySel: { backgroundColor: C.black },
  monthDayToday: { backgroundColor: C.cardAlt },
  monthDayNum: { fontSize: 14, fontWeight: '600', color: C.text },
  monthDayNumSel: { color: C.white, fontWeight: '800' },
  monthDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.black, marginTop: 2 },
  monthDotSel: { backgroundColor: C.black },

  // Day view header
  dayViewTitle: { fontSize: 16, fontWeight: '800', color: C.text, textAlign: 'center' },
  dayViewSub: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 1 },

  // Week strip
  weekStrip: { flexDirection: 'row-reverse', paddingHorizontal: 12, marginBottom: 8, gap: 4 },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  dayCellSelected: { backgroundColor: C.black },
  dayCellToday: { backgroundColor: C.cardAlt },
  dayName: { fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 4 },
  dayNameSelected: { color: C.white },
  dayNum: { fontSize: 18, fontWeight: '700', color: C.text },
  dayNumSelected: { color: C.white },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.text, marginTop: 4 },
  dotSelected: { backgroundColor: C.white },

  // Sessions list
  sessionsList: { paddingHorizontal: 20, marginTop: 10 },
  listDateLabel: { fontSize: 13, fontWeight: '700', color: C.textSecondary, textAlign: 'right', marginBottom: 10 },
  emptyCard: { backgroundColor: C.cardAlt, borderRadius: 12, padding: 32, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14, color: C.muted },

  card: { flexDirection: 'row-reverse', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  cardFull: { opacity: 0.5 },
  cardTime: { width: 56, backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  timeText: { fontSize: 12, fontWeight: '700', color: C.text },
  timeEnd: { color: C.muted },
  timeLine: { width: 1, height: 14, backgroundColor: C.border, marginVertical: 3 },
  cardContent: { flex: 1, padding: 14, alignItems: 'flex-end' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3 },
  cardMeta: { fontSize: 12, color: C.muted, marginBottom: 10 },
  cardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  spotsWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  spotsDot: { width: 7, height: 7, borderRadius: 4 },
  spotsWarn: { backgroundColor: C.warn },
  spotsFull: { backgroundColor: C.err },
  spotsText: { fontSize: 11, color: C.muted, fontWeight: '600' },
  enrollBtn: { backgroundColor: C.black, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8, minWidth: 70, alignItems: 'center' },
  enrollBtnFull: { backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border },
  enrollBtnText: { fontSize: 13, fontWeight: '700', color: C.white },
  enrollBtnTextFull: { color: C.muted },
  cancelBtn: { backgroundColor: C.bg, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.err },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: C.err },
});
