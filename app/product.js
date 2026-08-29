/**
 * ProductScreen — עמוד מוצר ציוד, מסך פנימי מלא.
 *
 * ⚠️ נוצר 27/08/2026 בעקבות דחיית אפל מ-20/08 (הנחיה 1.1.3).
 * אפל דחתה את גרסה 1.0.1 כי מדף הציוד אפשר לרכוש מוצרים הקשורים
 * לנשק בתוך האפליקציה — ובמפורש: "כולל תצוגת אתר בתוך האפליקציה
 * שממנה אפשר לקנות אותם". אותה הודעה גם קובעת מה כן מותר:
 * "אפשר לתת למשתמשים קישור למוצר שנפתח בדפדפן ברירת המחדל".
 *
 * לכן: כל המידע על המוצר נבנה כאן כמסך מקומי מנתוני השרת, ורק
 * הלחיצה על הכפתור יוצאת לדפדפן החיצוני. אין WebView במסלול הזה.
 * **אסור להחזיר את דף התשלום לתוך האפליקציה במסלול הציוד** — זו
 * בדיוק העילה לדחייה. מנויים וכרטיסיות הם שירות ולא מוצר נשק,
 * ואפל לא נגעה בהם, ולכן הם ממשיכים דרך app/payment.js.
 *
 * ⚠️ תוקן 29/08/2026 אחרי דחייה שנייה על אותה הנחיה (בילד 5, ביקורת 28/08).
 * הכפתור יצא לדפדפן — אבל ישר אל `pay_url`, דף הסליקה של גרואו. אפל
 * התירה במפורש קישור **למוצר**, לא לתשלום; הובלה ישירה לדף תשלום על
 * פריט נשק נחשבת אצלה רכישה שהאפליקציה משלימה. לכן הכפתור מפנה מעכשיו
 * ל-`product_url` — עמוד המוצר באתר — והרכישה עצמה מתחילה שם, מחוץ לאפליקציה.
 * **אין להחזיר את `pay_url` לכפתור הזה.**
 *
 * הנתונים נטענים מחדש מהשרת ולא מועברים כפרמטרים, כדי שהמחיר,
 * המלאי וזכאות המנוי יהיו מה שהשרת מכריע ולא מה שהמסך הקודם החזיק.
 */
import { useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { Text } from '../src/components/ScaledText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getStoreProducts } from '../src/services/subscription';
import { useTheme } from '../src/context/ThemeContext';

export default function ProductScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [item, setItem] = useState(null);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const { products, isSubscriber: sub } = await getStoreProducts();
      const found = (products || []).find((p) => p.id === id) || null;
      setItem(found);
      setIsSubscriber(sub);
      if (!found) setFailed(true);
    } catch (e) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const discounted = !!item && item.discount_eligible
    && Number(item.subscriber_price) < Number(item.price);
  const payPrice = isSubscriber && discounted ? item.subscriber_price : item?.price;

  const handleOpenProduct = async () => {
    // ⚠️ עמוד המוצר באתר בלבד — לא `pay_url`. ראה ההסבר בראש הקובץ.
    if (!item?.product_url) {
      Alert.alert(item?.name || 'המוצר', 'הפריט זמין דרך המשרד. ניצור איתך קשר להסדרת הרכישה.');
      return;
    }
    // יציאה לדפדפן החיצוני. לא להחליף ב-WebView.
    try {
      const ok = await Linking.canOpenURL(item.product_url);
      if (!ok) throw new Error('unsupported');
      await Linking.openURL(item.product_url);
    } catch (e) {
      Alert.alert('לא הצלחנו לפתוח את עמוד המוצר', 'נסה שוב, או פנה אלינו ונסדיר את הרכישה.');
    }
  };

  const specRows = [];
  if (item?.category_label) specRows.push({ label: 'קטגוריה', value: item.category_label });
  if (item?.carry_positions?.length) {
    specRows.push({ label: 'מנחי נשיאה', value: item.carry_positions.join(' · ') });
  }
  if (item?.fits_weapons?.length) {
    specRows.push({ label: 'מתאים ל', value: item.fits_weapons.join(' · ') });
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{item?.name || 'מוצר'}</Text>
        <View style={s.backBtn} />
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator color={C.black} /></View>
      ) : failed || !item ? (
        <View style={s.centered}>
          <Ionicons name="cloud-offline-outline" size={40} color={C.mutedLt} />
          <Text style={s.emptyText}>לא הצלחנו לטעון את המוצר</Text>
          <TouchableOpacity style={s.retryBtn} onPress={load} activeOpacity={0.7}>
            <Text style={s.retryText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            style={s.scroll}
            contentContainerStyle={[s.content, { paddingBottom: 24 }]}
          >
            <View style={s.imgWrap}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={s.img} resizeMode="cover" />
              ) : (
                <Ionicons name="cube-outline" size={48} color={C.mutedLt} />
              )}
              {!item.in_stock && (
                <View style={s.outBadge}><Text style={s.outBadgeText}>אזל</Text></View>
              )}
            </View>

            <Text style={s.name}>{item.name}</Text>

            <View style={s.priceRow}>
              <Text style={s.price}>{payPrice} ש"ח</Text>
              {isSubscriber && discounted ? (
                <>
                  <Text style={s.oldPrice}>{item.price}</Text>
                  <View style={s.subChip}><Text style={s.subChipText}>מחיר מנוי</Text></View>
                </>
              ) : null}
            </View>

            {!isSubscriber && discounted ? (
              <Text style={s.subHint}>
                למנויים {item.subscriber_price} ש"ח · חיסכון {item.price - item.subscriber_price} ש"ח
              </Text>
            ) : null}

            {isSubscriber && discounted && !item.subscriber_checkout_ready ? (
              <Text style={s.subWarn}>ההנחה תוסדר מולנו בעת הרכישה</Text>
            ) : null}

            {specRows.length ? (
              <View style={s.specBox}>
                {specRows.map((row) => (
                  <View key={row.label} style={s.specRow}>
                    <Text style={s.specLabel}>{row.label}</Text>
                    <Text style={s.specValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={s.noteBox}>
              <Ionicons name="lock-closed-outline" size={15} color={C.muted} />
              <Text style={s.noteText}>
                עמוד המוצר והרכישה נמצאים באתר שלנו ונפתחים בדפדפן. אחרי התשלום
                נארוז את הפריט ונעדכן אותך לגבי איסוף או משלוח.
              </Text>
            </View>
          </ScrollView>

          <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
            {item.in_stock ? (
              <TouchableOpacity style={s.buyBtn} onPress={handleOpenProduct} activeOpacity={0.8}>
                <Ionicons name="open-outline" size={17} color={C.white} />
                <Text style={s.buyText}>לצפייה במוצר באתר</Text>
              </TouchableOpacity>
            ) : (
              <View style={[s.buyBtn, s.buyBtnOut]}>
                <Text style={s.buyTextOut}>לא במלאי</Text>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.borderLt,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1, fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'center',
  },
  scroll: { flex: 1 },
  content: { padding: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyText: { fontSize: 15, color: C.muted, textAlign: 'center' },
  retryBtn: {
    backgroundColor: C.black, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 28,
  },
  retryText: { color: C.white, fontSize: 14, fontWeight: '700' },

  imgWrap: {
    width: '100%', height: 260, borderRadius: 14, backgroundColor: C.cardAlt,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 18,
  },
  img: { width: '100%', height: '100%' },
  outBadge: {
    position: 'absolute', top: 12, insetInlineStart: 12,
    backgroundColor: C.err, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4,
  },
  outBadgeText: { color: C.white, fontSize: 12, fontWeight: '800' },

  name: { fontSize: 20, fontWeight: '800', color: C.text, textAlign: 'right' },
  priceRow: {
    flexDirection: 'row-reverse', alignItems: 'baseline', gap: 9, marginTop: 10, flexWrap: 'wrap',
  },
  price: { fontSize: 26, fontWeight: '800', color: C.text },
  oldPrice: { fontSize: 15, color: C.mutedLt, textDecorationLine: 'line-through' },
  subChip: {
    backgroundColor: C.okLt, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  subChipText: { fontSize: 11, fontWeight: '800', color: C.ok },
  subHint: { fontSize: 13, color: C.accent2, textAlign: 'right', marginTop: 8 },
  subWarn: { fontSize: 12.5, color: C.warn, textAlign: 'right', marginTop: 8, lineHeight: 18 },

  specBox: {
    marginTop: 20, borderWidth: 1, borderColor: C.border, borderRadius: 12, overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderLt,
  },
  specLabel: { fontSize: 13, color: C.muted, fontWeight: '600' },
  specValue: { flex: 1, fontSize: 13, color: C.text, textAlign: 'left' },

  noteBox: {
    flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8,
    marginTop: 20, backgroundColor: C.cardAlt, borderRadius: 10, padding: 12,
  },
  noteText: { flex: 1, fontSize: 12, color: C.textSecondary, textAlign: 'right', lineHeight: 18 },

  footer: {
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.borderLt, backgroundColor: C.bg,
  },
  buyBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.black, borderRadius: 12, paddingVertical: 16,
  },
  buyBtnOut: { backgroundColor: C.borderLt },
  buyText: { color: C.white, fontSize: 16, fontWeight: '700' },
  buyTextOut: { color: C.muted, fontSize: 16, fontWeight: '700' },
});
