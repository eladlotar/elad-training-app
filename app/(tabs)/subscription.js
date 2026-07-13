import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getMySubscription,
  cancelSubscriptionRequest,
} from '../../src/services/subscription';
import { useTheme } from '../../src/context/ThemeContext';

const EMPTY = { subscriptions: [], pending_requests: [], late_cancel_count: 0, no_show_count: 0 };

function paymentBadge(status, C) {
  if (status === 'debt') return { text: 'חוב', bg: C.errLt, fg: C.err };
  if (status === 'pending_payment') return { text: 'ממתין לתשלום', bg: C.warnLt, fg: C.warn };
  return { text: 'שולם', bg: C.okLt, fg: C.ok };
}

export default function SubscriptionScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);
  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadData = async () => {
    try {
      setData(await getMySubscription());
    } catch (e) {
      if (!loaded) Alert.alert('שגיאה בטעינת המנוי', e.message);
    }
    setLoaded(true);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCancelRequest = (req) => {
    Alert.alert('ביטול בקשה', `לבטל את הבקשה להצטרפות ל"${req.product_name}"?`, [
      { text: 'לא', style: 'cancel' },
      {
        text: 'בטל בקשה', style: 'destructive',
        onPress: async () => {
          setBusyId(req.id);
          try {
            await cancelSubscriptionRequest(req.id);
            await loadData();
          } catch (e) {
            Alert.alert('שגיאה', e.message);
          } finally { setBusyId(null); }
        },
      },
    ]);
  };

  const { subscriptions, pending_requests: pending } = data;
  const isEmpty = loaded && subscriptions.length === 0 && pending.length === 0;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.black} />}
    >
      <Text style={s.title}>המנוי שלי</Text>

      {!loaded ? (
        <View style={s.emptyCard}>
          <ActivityIndicator size="large" color={C.black} />
        </View>
      ) : isEmpty ? (
        <View style={s.emptyCard}>
          <View style={s.iconWrap}>
            <Ionicons name="ribbon-outline" size={34} color={C.white} />
          </View>
          <Text style={s.emptyTitle}>אין מנוי פעיל</Text>
          <Text style={s.emptyText}>
            מנוי חודשי מקנה מכסת אימונים קבועה בכל חודש. אפשר להצטרף ישירות מהחנות.
          </Text>
          <TouchableOpacity
            style={s.shopBtn}
            onPress={() => router.push('/(tabs)/shop')}
            activeOpacity={0.7}
          >
            <Text style={s.shopBtnText}>לחנות המנויים</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Active subscriptions / entitlements */}
          {subscriptions.map(sub => {
            const badge = paymentBadge(sub.payment_status, C);
            const unpaid = sub.payment_status && sub.payment_status !== 'paid';
            const quota = sub.monthly_quota || 0;
            const used = sub.used_this_month || 0;
            const ratio = quota > 0 ? Math.min(used / quota, 1) : 0;
            return (
              <View key={sub.id} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardName}>{sub.product_name}</Text>
                  <View style={[s.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[s.badgeText, { color: badge.fg }]}>{badge.text}</Text>
                  </View>
                </View>

                {sub.is_subscription ? (
                  <View style={s.progressBlock}>
                    <Text style={s.bigNums}>
                      {used}
                      <Text style={s.bigNumsQuota}> / {quota}</Text>
                    </Text>
                    <View style={s.progressTrack}>
                      <View style={[s.progressFill, { width: `${ratio * 100}%` }]} />
                    </View>
                    {sub.usage_label ? <Text style={s.usageLabel}>{sub.usage_label}</Text> : null}
                  </View>
                ) : (
                  <Text style={s.creditsLine}>
                    {sub.credits_remaining == null
                      ? 'ללא הגבלת כניסות'
                      : `${sub.credits_remaining} כניסות נותרו`}
                  </Text>
                )}

                {unpaid && (
                  <View style={s.debtRow}>
                    <Ionicons name="alert-circle" size={15} color={C.err} />
                    <Text style={s.debtText}>יש להסדיר תשלום מול בית הספר</Text>
                  </View>
                )}

                {sub.renewal_label ? (
                  <View style={s.renewRow}>
                    <Ionicons name="refresh" size={13} color={C.muted} />
                    <Text style={s.renewText}>{sub.renewal_label}</Text>
                  </View>
                ) : sub.valid_to ? (
                  <View style={s.renewRow}>
                    <Ionicons name="calendar-outline" size={13} color={C.muted} />
                    <Text style={s.renewText}>בתוקף עד {sub.valid_to}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}

          {/* Pending join requests */}
          {pending.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>בקשות ממתינות</Text>
              {pending.map(req => (
                <View key={req.id} style={s.pendingCard}>
                  <View style={s.pendingInfo}>
                    <Text style={s.pendingName}>{req.product_name}</Text>
                    <Text style={s.pendingMeta}>
                      {req.price != null ? `${req.price} ש"ח לחודש · ` : ''}ממתין לאישור בית הספר
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={s.pendingCancelBtn}
                    onPress={() => handleCancelRequest(req)}
                    disabled={busyId === req.id}
                    activeOpacity={0.7}
                  >
                    {busyId === req.id
                      ? <ActivityIndicator size="small" color={C.err} />
                      : <Text style={s.pendingCancelText}>ביטול</Text>}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Discipline counters */}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statValue}>{data.late_cancel_count}</Text>
              <Text style={s.statLabel}>ביטולים מאוחרים</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statValue}>{data.no_show_count}</Text>
              <Text style={s.statLabel}>אי-הגעות</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 16 },

  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'right', marginBottom: 10 },

  // Subscription card
  card: {
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.black,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardName: { fontSize: 18, fontWeight: '800', color: C.text, flex: 1, textAlign: 'right' },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  progressBlock: { alignItems: 'flex-end', marginBottom: 10 },
  bigNums: { fontSize: 34, fontWeight: '800', color: C.text },
  bigNumsQuota: { fontSize: 20, fontWeight: '700', color: C.muted },
  progressTrack: {
    alignSelf: 'stretch',
    height: 10,
    backgroundColor: C.cardAlt,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 8,
    flexDirection: 'row-reverse',
  },
  progressFill: { height: '100%', backgroundColor: C.black, borderRadius: 5 },
  usageLabel: { fontSize: 13, color: C.textSecondary, fontWeight: '600', marginTop: 8 },

  creditsLine: { fontSize: 15, fontWeight: '700', color: C.textSecondary, textAlign: 'right', marginBottom: 10 },

  debtRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: C.errLt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    marginBottom: 10,
  },
  debtText: { fontSize: 12, fontWeight: '700', color: C.err },

  renewRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  renewText: { fontSize: 12, color: C.muted },

  // Pending requests
  pendingCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: C.cardAlt,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  pendingInfo: { flex: 1, alignItems: 'flex-end' },
  pendingName: { fontSize: 15, fontWeight: '700', color: C.text },
  pendingMeta: { fontSize: 12, color: C.muted, marginTop: 3 },
  pendingCancelBtn: {
    borderWidth: 1, borderColor: C.err, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7, minWidth: 60, alignItems: 'center',
  },
  pendingCancelText: { fontSize: 12, fontWeight: '700', color: C.err },

  // Counters
  statsRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 8 },
  statCard: {
    flex: 1,
    backgroundColor: C.cardAlt,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 4 },

  // Empty state
  emptyCard: {
    flex: 1, backgroundColor: C.cardAlt, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, marginTop: 40,
  },
  iconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: C.black, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21 },
  shopBtn: {
    backgroundColor: C.black, borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 6,
  },
  shopBtnText: { fontSize: 14, fontWeight: '700', color: C.white },
});
