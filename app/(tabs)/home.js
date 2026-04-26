import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { getUser } from '../../src/services/auth';
import { C } from '../../src/constants/theme';

export default function HomeScreen() {
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingSessions, setUpcomingSessions] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const u = await getUser();
    setUser(u);
    // TODO: Fetch upcoming sessions from Base44
    setUpcomingSessions([]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const firstName = (user?.full_name || '').split(' ')[0] || 'מתאמן';
  const greeting = getGreeting();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.gold} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting},</Text>
        <Text style={styles.name}>{firstName}</Text>
      </View>

      {/* Quick Book Button */}
      <TouchableOpacity
        style={styles.bookButton}
        onPress={() => router.push('/(tabs)/sessions')}
      >
        <Text style={styles.bookButtonText}>קבע אימון חדש</Text>
        <Text style={styles.bookButtonSub}>בחר מועד מהאימונים הפתוחים</Text>
      </TouchableOpacity>

      {/* Upcoming Sessions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>האימונים הקרובים שלך</Text>
        {upcomingSessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>אין אימונים קבועים</Text>
            <Text style={styles.emptySubtext}>לחץ למעלה לקביעת אימון</Text>
          </View>
        ) : (
          upcomingSessions.map((session, i) => (
            <View key={i} style={styles.sessionCard}>
              <View style={styles.sessionDate}>
                <Text style={styles.sessionDay}>
                  {new Date(session.date).toLocaleDateString('he-IL', { weekday: 'short' })}
                </Text>
                <Text style={styles.sessionDateNum}>
                  {new Date(session.date).getDate()}
                </Text>
              </View>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionTitle}>{session.title}</Text>
                <Text style={styles.sessionTime}>
                  {session.start_time} - {session.end_time}
                </Text>
                <Text style={styles.sessionLocation}>{session.location}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{user?.total_sessions || 0}</Text>
          <Text style={styles.statLabel}>אימונים</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{user?.remaining_credits || 0}</Text>
          <Text style={styles.statLabel}>קרדיטים</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'בוקר טוב';
  if (hour < 17) return 'צהריים טובים';
  if (hour < 21) return 'ערב טוב';
  return 'לילה טוב';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 60 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 14, color: C.muted, fontWeight: '600' },
  name: { fontSize: 28, fontWeight: '800', color: C.text, marginTop: 2 },

  bookButton: {
    backgroundColor: C.gold,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bookButtonText: { fontSize: 18, fontWeight: '800', color: C.white, textAlign: 'right' },
  bookButtonSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'right' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 12, textAlign: 'right' },

  emptyCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyText: { fontSize: 14, fontWeight: '700', color: C.muted },
  emptySubtext: { fontSize: 12, color: C.mutedLt, marginTop: 4 },

  sessionCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  sessionDate: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: C.goldLt,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sessionDay: { fontSize: 10, fontWeight: '700', color: C.goldDark },
  sessionDateNum: { fontSize: 18, fontWeight: '800', color: C.goldDark },
  sessionInfo: { flex: 1, alignItems: 'flex-end' },
  sessionTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  sessionTime: { fontSize: 12, color: C.muted, marginTop: 2 },
  sessionLocation: { fontSize: 11, color: C.mutedLt, marginTop: 1 },

  statsRow: { flexDirection: 'row-reverse', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  statValue: { fontSize: 28, fontWeight: '800', color: C.gold },
  statLabel: { fontSize: 12, color: C.muted, marginTop: 4 },
});
