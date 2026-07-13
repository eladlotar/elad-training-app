import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getProducts,
  getMySubscription,
  requestSubscription,
  cancelSubscriptionRequest,
} from '../../src/services/subscription';
import { useTheme } from '../../src/context/ThemeContext';

function quotaLabel(quota) {
  if (!quota) return null;
  if (quota === 1) return 'אימון אחד בחודש';
  return `${quota} אימונים בחודש`;
}

export default function ShopScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadData = async () => {
    try {
      setProducts(await getProducts());
    } catch (e) {
      if (!loaded) Alert.alert('שגיאה בטעינת החנות', e.message);
    }
    setLoaded(true);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleJoin = (product) => {
    // Payment page configured → embedded payment screen (WebView) inside the
    // app; membership appears after the webhook, refetched on tab focus.
    if (product.purchase_url) {
      router.push({
        pathname: '/payment',
        params: { url: product.purchase_url, name: product.name },
      });
      return;
    }
    // Backup flow — request + manual follow-up by the school.
    Alert.alert(
      product.name,
      'לאחר שליחת הבקשה ניצור איתך קשר להסדרת התשלום. המנוי ייפתח מיד לאחר מכן.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'שליחת בקשה',
          onPress: async () => {
            setBusyId(product.id);
            try {
              await requestSubscription(product.id);
              Alert.alert('הבקשה נשלחה!', 'ניצור איתך קשר בהקדם להסדרת התשלום.');
              await loadData();
            } catch (e) {
              Alert.alert('לא ניתן לשלוח בקשה', e.message);
              await loadData();
            } finally { setBusyId(null); }
          },
        },
      ]
    );
  };

  const handleCancelRequest = (product) => {
    Alert.alert('ביטול בקשה', `לבטל את הבקשה להצטרפות ל"${product.name}"?`, [
      { text: 'לא', style: 'cancel' },
      {
        text: 'בטל בקשה', style: 'destructive',
        onPress: async () => {
          setBusyId(product.id);
          try {
            // getProducts only flags pending_request per product — the request
            // id itself lives in getMySubscription, so resolve it from there.
            const data = await getMySubscription();
            const req = (data.pending_requests || []).find(r => r.product_id === product.id);
            if (req) await cancelSubscriptionRequest(req.id);
            await loadData();
          } catch (e) {
            Alert.alert('שגיאה', e.message);
          } finally { setBusyId(null); }
        },
      },
    ]);
  };

  const subscriptions = products.filter(p => p.is_subscription);
  const others = products.filter(p => !p.is_subscription);

  const renderCard = (p) => {
    const isBusy = busyId === p.id;
    const quota = quotaLabel(p.monthly_quota);
    return (
      <View key={p.id} style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.cardHeaderText}>
            <Text style={s.cardName}>{p.name}</Text>
            <Text style={s.cardPrice}>
              {p.is_subscription ? `${p.price} ש"ח לחודש` : `${p.price} ש"ח`}
            </Text>
          </View>
          {p.owned && (
            <View style={[s.chip, s.chipOwned]}>
              <Ionicons name="checkmark-circle" size={14} color={C.ok} />
              <Text style={s.chipOwnedText}>מנוי פעיל</Text>
            </View>
          )}
          {!p.owned && p.pending_request && (
            <View style={[s.chip, s.chipPending]}>
              <Ionicons name="time-outline" size={14} color={C.warn} />
              <Text style={s.chipPendingText}>ממתין לאישור</Text>
            </View>
          )}
        </View>

        {p.is_subscription && quota && (
          <View style={s.quotaRow}>
            <Ionicons name="repeat" size={15} color={C.textSecondary} />
            <Text style={s.quotaText}>{quota}</Text>
          </View>
        )}

        {p.description ? <Text style={s.cardDesc}>{p.description}</Text> : null}

        {/* Action area */}
        {p.owned ? null : p.pending_request ? (
          <TouchableOpacity
            style={s.cancelReqBtn}
            onPress={() => handleCancelRequest(p)}
            disabled={isBusy}
            activeOpacity={0.7}
          >
            {isBusy
              ? <ActivityIndicator size="small" color={C.err} />
              : <Text style={s.cancelReqText}>ביטול בקשה</Text>}
          </TouchableOpacity>
        ) : p.is_subscription ? (
          <TouchableOpacity
            style={s.joinBtn}
            onPress={() => handleJoin(p)}
            disabled={isBusy}
            activeOpacity={0.7}
          >
            {isBusy
              ? <ActivityIndicator size="small" color={C.white} />
              : <Text style={s.joinBtnText}>הצטרפות למנוי</Text>}
          </TouchableOpacity>
        ) : p.purchase_url ? (
          <TouchableOpacity
            style={s.joinBtn}
            onPress={() => handleJoin(p)}
            activeOpacity={0.7}
          >
            <Text style={s.joinBtnText}>לרכישה</Text>
          </TouchableOpacity>
        ) : (
          <Text style={s.contactText}>לרכישה: התקשרו אלינו</Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.black} />}
    >
      <Text style={s.title}>החנות</Text>

      {!loaded ? (
        <View style={s.emptyCard}>
          <ActivityIndicator size="large" color={C.black} />
        </View>
      ) : products.length === 0 ? (
        <View style={s.emptyCard}>
          <View style={s.iconWrap}>
            <Ionicons name="bag-handle-outline" size={34} color={C.white} />
          </View>
          <Text style={s.emptyTitle}>אין מוצרים זמינים כרגע</Text>
          <Text style={s.emptyText}>
            מנויים ומוצרים חדשים יופיעו כאן ברגע שיפורסמו. שווה לחזור לבדוק.
          </Text>
        </View>
      ) : (
        <>
          {subscriptions.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>מנויים חודשיים</Text>
              {subscriptions.map(renderCard)}
              <TouchableOpacity onPress={() => router.push('/terms')} activeOpacity={0.7}>
                <Text style={s.termsLink}>ההצטרפות למנוי כפופה לתקנון המנויים — לחצו לקריאה</Text>
              </TouchableOpacity>
            </View>
          )}
          {others.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>מוצרים נוספים</Text>
              {others.map(renderCard)}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 16 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'right', marginBottom: 10 },

  card: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardHeaderText: { flex: 1, alignItems: 'flex-end' },
  cardName: { fontSize: 17, fontWeight: '800', color: C.text },
  cardPrice: { fontSize: 15, fontWeight: '700', color: C.textSecondary, marginTop: 3 },

  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
  },
  chipOwned: { backgroundColor: C.okLt },
  chipOwnedText: { fontSize: 11, fontWeight: '700', color: C.ok },
  chipPending: { backgroundColor: C.warnLt },
  chipPendingText: { fontSize: 11, fontWeight: '700', color: C.warn },

  quotaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  quotaText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },

  cardDesc: { fontSize: 13, color: C.muted, textAlign: 'right', lineHeight: 19, marginBottom: 12 },

  joinBtn: {
    backgroundColor: C.black,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  joinBtnText: { fontSize: 14, fontWeight: '700', color: C.white },

  cancelReqBtn: {
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.err,
    marginTop: 4,
  },
  cancelReqText: { fontSize: 13, fontWeight: '700', color: C.err },

  contactText: { fontSize: 13, fontWeight: '600', color: C.muted, textAlign: 'center', marginTop: 4, paddingVertical: 8 },

  termsLink: {
    fontSize: 12.5, fontWeight: '600', color: C.textSecondary,
    textAlign: 'center', textDecorationLine: 'underline', marginTop: 6, paddingVertical: 4,
  },

  emptyCard: {
    flex: 1, backgroundColor: C.cardAlt, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, marginTop: 40,
  },
  iconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: C.black, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21 },
});
