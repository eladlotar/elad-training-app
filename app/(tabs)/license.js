import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getUser } from '../../src/services/auth';
import { C } from '../../src/constants/theme';

export default function LicenseScreen() {
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const u = await getUser();
    setUser(u);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const expiry = user?.weapon_license_expiry ? new Date(user.weapon_license_expiry) : null;
  const now = new Date();
  const diffDays = expiry ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)) : null;

  let statusColor = C.ok;
  let statusBg = C.okLt;
  let statusText = 'תקין';
  if (diffDays !== null) {
    if (diffDays < 0) { statusColor = C.err; statusBg = C.errLt; statusText = 'פג תוקף'; }
    else if (diffDays <= 7) { statusColor = C.err; statusBg = C.errLt; statusText = 'קריטי'; }
    else if (diffDays <= 30) { statusColor = C.warn; statusBg = C.warnLt; statusText = 'פג בקרוב'; }
    else if (diffDays <= 60) { statusColor = C.warn; statusBg = C.warnLt; statusText = 'שים לב'; }
  }

  const handleReminder = () => {
    Alert.alert('תזכורת נשלחה', 'תזכורת לחידוש רישיון נשלחה אליך בוואטסאפ');
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.black} />}
    >
      <Text style={s.title}>רישיון נשק</Text>

      {/* Status Card */}
      <View style={[s.statusCard, { borderColor: statusColor }]}>
        <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
          <Text style={[s.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>

        {diffDays !== null ? (
          <>
            <Text style={s.daysNumber}>{Math.abs(diffDays)}</Text>
            <Text style={s.daysLabel}>
              {diffDays < 0 ? 'ימים מאז שפג' : 'ימים עד פקיעה'}
            </Text>
          </>
        ) : (
          <Text style={s.noData}>לא הוזן תאריך פקיעה</Text>
        )}
      </View>

      {/* Details */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>פרטי רישיון</Text>

        <View style={s.row}>
          <Text style={s.rowValue}>{user?.license_type || 'לא הוזן'}</Text>
          <Text style={s.rowLabel}>סוג רישיון</Text>
        </View>

        <View style={s.row}>
          <Text style={s.rowValue}>
            {expiry ? expiry.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'לא הוזן'}
          </Text>
          <Text style={s.rowLabel}>תאריך פקיעה</Text>
        </View>

        <View style={s.row}>
          <Text style={s.rowValue}>{user?.full_name || '-'}</Text>
          <Text style={s.rowLabel}>שם בעל הרישיון</Text>
        </View>
      </View>

      {/* Reminder button */}
      {diffDays !== null && diffDays <= 60 && (
        <TouchableOpacity style={s.reminderBtn} onPress={handleReminder} activeOpacity={0.7}>
          <Text style={s.reminderBtnText}>שלח תזכורת חידוש</Text>
        </TouchableOpacity>
      )}

      {/* Info */}
      <View style={s.infoCard}>
        <Text style={s.infoTitle}>חידוש רישיון</Text>
        <Text style={s.infoText}>
          יש לחדש את הרישיון לפני תאריך הפקיעה.{'\n'}
          לחידוש יש לפנות למשרד הפנים או למשרד לביטחון לאומי עם תעודה מזהה ואישור רפואי.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },

  title: { fontSize: 24, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 20 },

  statusCard: {
    backgroundColor: C.bg,
    borderWidth: 2,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusText: { fontSize: 13, fontWeight: '700' },
  daysNumber: { fontSize: 56, fontWeight: '800', color: C.text },
  daysLabel: { fontSize: 14, color: C.muted, marginTop: 4 },
  noData: { fontSize: 16, color: C.muted, marginTop: 12 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'right', marginBottom: 10 },

  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.cardAlt,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
  },
  rowLabel: { fontSize: 13, fontWeight: '600', color: C.text },
  rowValue: { fontSize: 13, color: C.muted },

  reminderBtn: {
    backgroundColor: C.black,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  reminderBtnText: { fontSize: 15, fontWeight: '700', color: C.white },

  infoCard: {
    backgroundColor: C.cardAlt,
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: C.text, textAlign: 'right', marginBottom: 8 },
  infoText: { fontSize: 13, color: C.muted, textAlign: 'right', lineHeight: 20 },
});
