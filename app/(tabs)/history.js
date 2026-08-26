import { useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Text } from '../../src/components/ScaledText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMyTrainingHistory } from '../../src/services/history';
import { parseLocalDate } from '../../src/utils/date';
import { useTheme } from '../../src/context/ThemeContext';

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// הקביעה של הצוות אחרי האימון. רישום בלבד ("active") לא מוצג כתגית —
// תגית "רשום" על אימון שכבר עבר רק מבלבלת.
const ATTENDANCE = {
  attended:       { label: 'נכח',          tone: 'ok'   },
  absent:         { label: 'לא הגיע',      tone: 'err'  },
  late_cancelled: { label: 'ביטול מאוחר',  tone: 'warn' },
};

function fmtDate(d) {
  if (!d) return '';
  return `${d.getDate()}.${d.getMonth() + 1}.${String(d.getFullYear()).slice(-2)}`;
}

export default function HistoryScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);
  const insets = useSafeAreaInsets();

  const [summary, setSummary] = useState({});
  const [history, setHistory] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const r = await getMyTrainingHistory();
      setSummary(r.summary);
      setHistory(r.history);
      setLoadError(false);
    } catch {
      // מצב שגיאה מפורש ולא בליעה שקטה — מסך ריק בלי הסבר נראה
      // למתאמן כאילו אין לו אימונים, וזה שקר.
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

  const firstDate = parseLocalDate(summary.first_date);
  const lastDate  = parseLocalDate(summary.last_date);
  const totalAmmo = summary.total_ammo || 0;
  const trainingAmmo = summary.training_ammo || 0;
  const privateAmmo = summary.private_ammo || 0;

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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.black} />
      }
    >
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-forward" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={s.title}>האימונים שלי</Text>
      </View>

      {!loaded ? (
        <View style={s.centerBox}>
          <ActivityIndicator color={C.black} />
        </View>
      ) : loadError ? (
        <View style={s.emptyCard}>
          <Ionicons name="cloud-offline-outline" size={32} color={C.mutedLt} />
          <Text style={s.emptyText}>לא הצלחנו לטעון את ההיסטוריה</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadData} activeOpacity={0.7}>
            <Text style={s.retryBtnText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* לוח ההישגים — זה מה שהופך את המסך לכרטיס אישי ולא לרשימה.
              מונה הכדורים מוצג רק כשיש מה להציג: כמות התחמושת נרשמת
              ביומן היורים רק בחלק קטן מהאימונים, ו"0 כדורים" באותיות
              ענקיות הוא הדבר הראשון שהמתאמן היה רואה. כשאין נתון —
              מוצג במקומו האימון האחרון, שתמיד קיים. */}
          <View style={s.hero}>
            <View style={s.heroRow}>
              <View style={s.heroStat}>
                <Text style={s.heroValue}>{(summary.total_sessions || 0).toLocaleString()}</Text>
                <Text style={s.heroLabel}>אימונים</Text>
              </View>
              {totalAmmo > 0 ? (
                <>
                  <View style={s.heroDivider} />
                  <View style={s.heroStat}>
                    <Text style={s.heroValue}>{totalAmmo.toLocaleString()}</Text>
                    <Text style={s.heroLabel}>כדורים</Text>
                  </View>
                </>
              ) : lastDate ? (
                <>
                  <View style={s.heroDivider} />
                  <View style={s.heroStat}>
                    <Text style={s.heroValueSm}>{fmtDate(lastDate)}</Text>
                    <Text style={s.heroLabel}>אימון אחרון</Text>
                  </View>
                </>
              ) : null}
            </View>

            {firstDate ? (
              <Text style={s.heroSince}>מתאמן אצלנו מאז {fmtDate(firstDate)}</Text>
            ) : null}

            {totalAmmo > 0 && privateAmmo > 0 ? (
              <View style={s.heroBreak}>
                <Text style={s.heroBreakText}>תחמושת אימון {trainingAmmo.toLocaleString()}</Text>
                <Text style={s.heroBreakDot}>·</Text>
                <Text style={s.heroBreakText}>פרטית {privateAmmo.toLocaleString()}</Text>
              </View>
            ) : null}
          </View>

          {history.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="time-outline" size={32} color={C.mutedLt} />
              <Text style={s.emptyText}>עוד לא רשומים לך אימונים</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/sessions')}>
                <Text style={s.emptyLink}>לקביעת אימון</Text>
              </TouchableOpacity>
            </View>
          ) : (
            history.map(h => {
              const d = parseLocalDate(h.date);
              const att = ATTENDANCE[h.attendance];
              return (
                <View key={h.id} style={s.card}>
                  <View style={s.cardDate}>
                    <Text style={s.cardDay}>{d ? d.getDate() : '-'}</Text>
                    <Text style={s.cardMonth}>
                      {d ? d.toLocaleDateString('he-IL', { month: 'short' }) : ''}
                    </Text>
                    <Text style={s.cardYear}>{d ? String(d.getFullYear()).slice(-2) : ''}</Text>
                  </View>

                  <View style={s.cardContent}>
                    <View style={s.cardTitleRow}>
                      {att ? (
                        <View style={[s.badge, s[`badge_${att.tone}`]]}>
                          <Text style={[s.badgeText, s[`badgeText_${att.tone}`]]}>{att.label}</Text>
                        </View>
                      ) : null}
                      <Text style={s.cardTitle} numberOfLines={1}>{h.title}</Text>
                    </View>

                    <Text style={s.cardMeta}>
                      {d ? `יום ${DAY_NAMES[d.getDay()]}` : ''}{h.start_time ? ` | ${h.start_time}` : ''}
                    </Text>
                    {h.instructor_name ? (
                      <Text style={s.cardMeta}>מדריך: {h.instructor_name}</Text>
                    ) : null}

                    {h.total_ammo > 0 ? (
                      <View style={s.ammoRow}>
                        <Text style={s.ammoValue}>{h.total_ammo}</Text>
                        <Text style={s.ammoLabel}>כדורים</Text>
                        {h.private_ammo > 0 ? (
                          <Text style={s.ammoSub}>({h.private_ammo} פרטית)</Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  // ריווח תחתון גדול — סרגל הלשוניות מרחף מעל התוכן, ובלעדיו
  // הכרטיס האחרון נחתך בדיוק באמצע.
  content: { padding: 20, paddingBottom: 110 },

  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800', color: C.text, textAlign: 'right' },

  centerBox: { paddingVertical: 60, alignItems: 'center' },

  hero: {
    backgroundColor: C.black,
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  heroRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroValue: { fontSize: 34, fontWeight: '800', color: C.white },
  heroValueSm: { fontSize: 22, fontWeight: '800', color: C.white, marginTop: 8 },
  heroLabel: { fontSize: 12, color: C.white, opacity: 0.75, marginTop: 2 },
  heroDivider: { width: 1, height: 40, backgroundColor: C.white, opacity: 0.22 },
  heroSince: {
    fontSize: 12, color: C.white, opacity: 0.8,
    textAlign: 'center', marginTop: 14,
  },
  heroBreak: {
    flexDirection: 'row-reverse', justifyContent: 'center',
    alignItems: 'center', gap: 6, marginTop: 6,
  },
  heroBreakText: { fontSize: 11, color: C.white, opacity: 0.65 },
  heroBreakDot: { fontSize: 11, color: C.white, opacity: 0.45 },

  emptyCard: {
    backgroundColor: C.cardAlt, borderRadius: 14,
    padding: 36, alignItems: 'center', gap: 8,
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
    borderWidth: 1, borderColor: C.border,
    borderRadius: 14, marginBottom: 10, overflow: 'hidden',
  },
  cardDate: {
    width: 64, backgroundColor: C.cardAlt,
    justifyContent: 'center', alignItems: 'center', paddingVertical: 14,
  },
  cardDay: { fontSize: 22, fontWeight: '800', color: C.text },
  cardMonth: { fontSize: 11, color: C.textSecondary },
  cardYear: { fontSize: 10, color: C.mutedLt, marginTop: 1 },

  cardContent: { flex: 1, padding: 14, alignItems: 'flex-end' },
  cardTitleRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    gap: 8, alignSelf: 'stretch', justifyContent: 'flex-start',
  },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text, textAlign: 'right' },
  cardMeta: { fontSize: 12, color: C.muted, marginTop: 3 },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badge_ok:   { backgroundColor: C.okLt },
  badge_err:  { backgroundColor: C.errLt },
  badge_warn: { backgroundColor: C.warnLt },
  badgeText_ok:   { color: C.ok },
  badgeText_err:  { color: C.err },
  badgeText_warn: { color: C.warn },

  ammoRow: {
    flexDirection: 'row-reverse', alignItems: 'baseline',
    gap: 5, marginTop: 8,
  },
  ammoValue: { fontSize: 17, fontWeight: '800', color: C.accent2 },
  ammoLabel: { fontSize: 11, color: C.muted },
  ammoSub: { fontSize: 10, color: C.mutedLt },
});
