import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getUser } from '../../src/services/auth';
import { getNextSession, getMyEnrollments } from '../../src/services/sessions';
import { C } from '../../src/constants/theme';

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'בוקר טוב';
  if (h < 17) return 'צהריים טובים';
  if (h < 21) return 'ערב טוב';
  return 'לילה טוב';
}

function getLicenseWarning(expiryStr) {
  if (!expiryStr) return null;
  const now = new Date();
  const expiry = new Date(expiryStr);
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: 'הרישיון פג תוקף!', color: C.err, bg: C.errLt };
  if (diffDays <= 7) return { text: `הרישיון פג בעוד ${diffDays} ימים!`, color: C.err, bg: C.errLt };
  if (diffDays <= 30) return { text: `הרישיון פג בעוד ${diffDays} ימים`, color: C.warn, bg: C.warnLt };
  if (diffDays <= 60) return { text: `תוקף רישיון: ${diffDays} ימים`, color: C.muted, bg: C.cardAlt };
  return null;
}

export default function HomeScreen() {
  const [user, setUser] = useState(null);
  const [nextSession, setNextSession] = useState(null);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const u = await getUser();
    setUser(u);
    setNextSession(getNextSession());
    if (u?.id) {
      try {
        const enr = await getMyEnrollments(u.id);
        setMyEnrollments(enr);
      } catch {}
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const firstName = (user?.full_name || '').split(' ')[0] || 'מתאמן';
  const licenseWarn = getLicenseWarning(user?.weapon_license_expiry);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.black} />}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.greeting}>{getGreeting()}</Text>
        <Text style={s.name}>{firstName}</Text>
      </View>

      {/* License Warning */}
      {licenseWarn && (
        <TouchableOpacity
          style={[s.warnBanner, { backgroundColor: licenseWarn.bg }]}
          onPress={() => router.push('/(tabs)/license')}
          activeOpacity={0.7}
        >
          <Text style={[s.warnText, { color: licenseWarn.color }]}>{licenseWarn.text}</Text>
          <Text style={[s.warnArrow, { color: licenseWarn.color }]}>{'<'}</Text>
        </TouchableOpacity>
      )}

      {/* Next Session */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>האימון הבא</Text>
        {nextSession ? (
          <View style={s.nextCard}>
            <View style={s.nextCardRight}>
              <Text style={s.nextTitle}>{nextSession.title}</Text>
              <Text style={s.nextMeta}>
                יום {DAY_NAMES[new Date(nextSession.date).getDay()]} | {nextSession.start_time} - {nextSession.end_time}
              </Text>
              <Text style={s.nextMeta}>{nextSession.location}</Text>
              <Text style={s.nextInstructor}>{nextSession.instructor_name}</Text>
            </View>
            <View style={s.nextCardLeft}>
              <Text style={s.nextDay}>{new Date(nextSession.date).getDate()}</Text>
              <Text style={s.nextMonth}>
                {new Date(nextSession.date).toLocaleDateString('he-IL', { month: 'short' })}
              </Text>
            </View>
          </View>
        ) : (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>אין אימון קרוב</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/sessions')}>
              <Text style={s.emptyLink}>קבע אימון</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Quick Stats */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statValue}>{user?.remaining_credits || 0}</Text>
          <Text style={s.statLabel}>קרדיטים</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{user?.total_sessions || 0}</Text>
          <Text style={s.statLabel}>אימונים</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{myEnrollments.length}</Text>
          <Text style={s.statLabel}>רשום</Text>
        </View>
      </View>

      {/* Book Button */}
      <TouchableOpacity
        style={s.bookBtn}
        onPress={() => router.push('/(tabs)/sessions')}
        activeOpacity={0.7}
      >
        <Text style={s.bookBtnText}>+ קבע אימון חדש</Text>
      </TouchableOpacity>

      {/* My Upcoming */}
      {myEnrollments.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>נרשמתי ({myEnrollments.length})</Text>
          {myEnrollments.map(e => (
            <View key={e.id} style={s.enrollCard}>
              <Text style={s.enrollTitle}>{e.session_title}</Text>
              <Text style={s.enrollMeta}>{e.session_date} | {e.session_time}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },

  header: { marginBottom: 24, alignItems: 'flex-end' },
  greeting: { fontSize: 14, color: C.muted },
  name: { fontSize: 28, fontWeight: '800', color: C.text, marginTop: 2 },

  warnBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  warnText: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
  warnArrow: { fontSize: 16, fontWeight: '700', marginRight: 8 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'right', marginBottom: 10 },

  nextCard: {
    flexDirection: 'row-reverse',
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.text,
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextCardRight: { flex: 1, padding: 16, alignItems: 'flex-end' },
  nextCardLeft: {
    width: 70,
    backgroundColor: C.text,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  nextTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6 },
  nextMeta: { fontSize: 13, color: C.muted, marginTop: 2 },
  nextInstructor: { fontSize: 12, color: C.mutedLt, marginTop: 4 },
  nextDay: { fontSize: 28, fontWeight: '800', color: C.white },
  nextMonth: { fontSize: 12, color: C.white, opacity: 0.8 },

  emptyCard: {
    backgroundColor: C.cardAlt,
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: C.muted },
  emptyLink: { fontSize: 14, color: C.text, fontWeight: '700', marginTop: 8, textDecorationLine: 'underline' },

  statsRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: C.cardAlt,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 4 },

  bookBtn: {
    backgroundColor: C.black,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  bookBtnText: { fontSize: 16, fontWeight: '700', color: C.white },

  enrollCard: {
    backgroundColor: C.cardAlt,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
    alignItems: 'flex-end',
  },
  enrollTitle: { fontSize: 14, fontWeight: '600', color: C.text },
  enrollMeta: { fontSize: 12, color: C.muted, marginTop: 3 },
});
