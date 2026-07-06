import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';

export default function ShopScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>החנות</Text>
      <View style={s.emptyCard}>
        <View style={s.iconWrap}><Ionicons name="bag-handle-outline" size={34} color={C.white} /></View>
        <Text style={s.emptyTitle}>החנות בהקמה</Text>
        <Text style={s.emptyText}>
          כאן יופיעו המוצרים והמנויים שתפרסם — מנויים חודשיים, קורסים,
          אימונים בודדים וציוד. הלקוחות יוכלו לרכוש ישירות מהאפליקציה.
        </Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 20 },
  emptyCard: {
    flex: 1, backgroundColor: C.cardAlt, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, marginTop: 40,
  },
  iconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: C.black, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21 },
});
