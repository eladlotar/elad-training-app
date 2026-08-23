import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
  RefreshControl, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getProducts,
  getStoreProducts,
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
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [gear, setGear] = useState([]);
  // 'services' = memberships (Product) · 'gear' = equipment (StoreProduct)
  const [tab, setTab] = useState('services');
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadData = async () => {
    // The two catalogues are independent: a failure in one must not blank the
    // other, so they settle separately rather than in a single try block.
    const [svc, eq] = await Promise.allSettled([getProducts(), getStoreProducts()]);
    if (svc.status === 'fulfilled') {
      setProducts(svc.value);
      setLoadError(false);
    } else {
      setLoadError(true);
    }
    setGear(eq.status === 'fulfilled' ? eq.value : []);
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

  const handleBuyGear = (item) => {
    if (!item.in_stock) return;
    if (item.pay_url) {
      router.push({ pathname: '/payment', params: { url: item.pay_url, name: item.name } });
      return;
    }
    Alert.alert(item.name, 'הפריט זמין דרך המשרד. ניצור איתך קשר להסדרת הרכישה.');
  };

  const renderGearCard = (item) => (
    <View key={item.id} style={[s.gearCard, !item.in_stock && s.gearCardOut]}>
      <View style={s.gearImgWrap}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={[s.gearImg, !item.in_stock && s.gearImgOut]}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="cube-outline" size={26} color={C.mutedLt} />
        )}
        {!item.in_stock && (
          <View style={s.outBadge}><Text style={s.outBadgeText}>אזל</Text></View>
        )}
      </View>
      <Text style={s.gearName} numberOfLines={2}>{item.name}</Text>
      <View style={s.gearFooter}>
        <Text style={s.gearPrice}>{item.price} ש"ח</Text>
        {item.in_stock ? (
          <TouchableOpacity style={s.gearBuyBtn} onPress={() => handleBuyGear(item)} activeOpacity={0.7}>
            <Text style={s.gearBuyText}>לרכישה</Text>
          </TouchableOpacity>
        ) : (
          <Text style={s.gearOutText}>לא במלאי</Text>
        )}
      </View>
    </View>
  );

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
      contentContainerStyle={[s.content, {
        paddingTop: insets.top + 12,
        // סרגל הלשוניות מרחף מעל התוכן: 57 פיקסלים לסרגל, 24 לכפתור
        // הבית שבולט מעליו, ועוד אוויר. ריווח קבוע של 40 היה קטן
        // מהסרגל עצמו, ולכן הכרטיס האחרון בכל מסך נחתך מתחתיו.
        paddingBottom: insets.bottom + 96,
      }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.black} />}
    >
      <Text style={s.title}>החנות</Text>

      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === 'services' && s.tabOn]}
          onPress={() => setTab('services')} activeOpacity={0.8}>
          <Text style={[s.tabText, tab === 'services' && s.tabTextOn]}>מנויים</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'gear' && s.tabOn]}
          onPress={() => setTab('gear')} activeOpacity={0.8}>
          <Text style={[s.tabText, tab === 'gear' && s.tabTextOn]}>ציוד</Text>
        </TouchableOpacity>
      </View>

      {!loaded ? (
        <View style={s.emptyCard}>
          <ActivityIndicator size="large" color={C.black} />
        </View>
      ) : loadError && products.length === 0 ? (
        /* Fetch failed → error + retry, not the "shop is empty" message */
        <View style={s.emptyCard}>
          <View style={s.iconWrap}>
            <Ionicons name="cloud-offline-outline" size={34} color={C.white} />
          </View>
          <Text style={s.emptyTitle}>לא הצלחנו לטעון את החנות</Text>
          <Text style={s.emptyText}>בדקו את החיבור לאינטרנט ונסו שוב.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadData} activeOpacity={0.7}>
            <Text style={s.retryBtnText}>נסה שוב</Text>
          </TouchableOpacity>
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
          {tab === 'services' ? (
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
          ) : gear.length === 0 ? (
            <View style={s.emptyCard}>
              <View style={s.iconWrap}>
                <Ionicons name="cube-outline" size={34} color={C.white} />
              </View>
              <Text style={s.emptyTitle}>אין ציוד זמין כרגע</Text>
              <Text style={s.emptyText}>הקטלוג מתעדכן מהמשרד. שווה לחזור לבדוק.</Text>
            </View>
          ) : (
            /* One section per category; the server already sorts by category,
               then in-stock, then price. */
            Object.entries(
              gear.reduce((acc, it) => {
                (acc[it.category_label] ||= []).push(it);
                return acc;
              }, {})
            ).map(([label, items]) => (
              <View key={label} style={s.section}>
                <Text style={s.sectionTitle}>{label}</Text>
                <View style={s.gearGrid}>{items.map(renderGearCard)}</View>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 40, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 16 },

  tabs: {
    flexDirection: 'row-reverse', backgroundColor: C.cardAlt,
    borderRadius: 10, padding: 3, marginBottom: 18,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  tabOn: { backgroundColor: C.black },
  tabText: { fontSize: 14, fontWeight: '700', color: C.textSecondary },
  tabTextOn: { color: C.white },

  gearGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  gearCard: {
    width: '48%', backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, marginBottom: 12, overflow: 'hidden',
  },
  gearCardOut: { opacity: 0.72 },
  gearImgWrap: {
    height: 110, backgroundColor: C.accentLt,
    alignItems: 'center', justifyContent: 'center',
  },
  gearImg: { width: '100%', height: '100%' },
  gearImgOut: { opacity: 0.5 },
  outBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: C.err, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  outBadgeText: { color: C.white, fontSize: 11, fontWeight: '700' },
  gearName: {
    fontSize: 12, fontWeight: '600', color: C.text, textAlign: 'right',
    paddingHorizontal: 10, paddingTop: 9, minHeight: 46, lineHeight: 17,
  },
  gearFooter: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingBottom: 10, paddingTop: 2,
  },
  gearPrice: { fontSize: 15, fontWeight: '800', color: C.black },
  gearBuyBtn: {
    backgroundColor: C.black, borderRadius: 7,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  gearBuyText: { color: C.white, fontSize: 12, fontWeight: '700' },
  gearOutText: { fontSize: 11, fontWeight: '600', color: C.muted },

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
    textAlign: 'center', textDecorationLine: 'underline', marginTop: 6, paddingVertical: 14,
  },

  emptyCard: {
    flex: 1, backgroundColor: C.cardAlt, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, marginTop: 40,
  },
  iconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: C.black, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21 },
  retryBtn: {
    backgroundColor: C.black, borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 11, marginTop: 6,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: C.white },
});
