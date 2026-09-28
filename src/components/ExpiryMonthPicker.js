/**
 * ExpiryMonthPicker — בחירת תוקף רישיון לפי חודש ושנה, כמו שממלאים ביומן יורים.
 *
 * הרישיון תקף תמיד עד סוף החודש, ולכן נשמר תמיד היום האחרון של אותו חודש:
 * יולי 2029 → 2029-07-31, ספטמבר 2028 → 2028-09-30, פברואר 2028 → 2028-02-29.
 *
 * value / onChange עובדים בפורמט YYYY-MM-DD.
 */
import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Text } from './ScaledText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const HEB_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const pad2 = (n) => (n < 10 ? '0' + n : '' + n);

// היום האחרון בחודש. יום 0 של החודש הבא הוא היום האחרון של החודש הנוכחי,
// וכך גם פברואר בשנה מעוברת יוצא נכון (29) בלי חישוב מיוחד.
export const lastDayOfMonth = (year, month1) => new Date(year, month1, 0).getDate();

/** YYYY-MM-DD של היום האחרון בחודש שנבחר. */
export const toLastDayISO = (year, monthIndex) =>
  `${year}-${pad2(monthIndex + 1)}-${pad2(lastDayOfMonth(year, monthIndex + 1))}`;

/** תצוגה לעברית: 31/07/2029 */
export function fmtExpiry(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

export default function ExpiryMonthPicker({ label = 'תוקף רישיון (חודש ושנה)', value, onChange, colors }) {
  // מסך הכניסה עדיין עובד עם לוח הצבעים הקבוע ולא עם בורר הערכות,
  // ולכן אפשר להעביר לוח צבעים ידנית במקום זה של ההקשר.
  const theme = useTheme();
  const C = colors || theme.C;
  const s = makeStyles(C);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(value ? +String(value).slice(0, 4) : new Date().getFullYear());

  const openPicker = () => {
    setYear(value ? +String(value).slice(0, 4) : new Date().getFullYear());
    setOpen(true);
  };

  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.select} onPress={openPicker} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={18} color={C.muted} />
        <Text style={[s.selectText, !value && s.selectPlaceholder]}>
          {value ? fmtExpiry(value) : 'בחר חודש ושנה'}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={24} color={C.muted} />
              </TouchableOpacity>
              <Text style={s.modalTitle}>תוקף רישיון</Text>
            </View>

            {/* שנים */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={s.yearRow}>
                {/* רישיון תקף עד כשלוש שנים — מאפשרים עד ארבע שנים קדימה */}
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                  <TouchableOpacity key={y} style={[s.yearChip, year === y && s.yearChipActive]} onPress={() => setYear(y)}>
                    <Text style={[s.yearChipText, year === y && s.yearChipTextActive]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* חודשים */}
            <View style={s.monthGrid}>
              {HEB_MONTHS.map((mName, mi) => {
                const now = new Date();
                const maxD = new Date(now.getFullYear() + 4, now.getMonth(), 1);
                const cell = new Date(year, mi, 1);
                const isPast = cell < new Date(now.getFullYear(), now.getMonth(), 1);
                const blocked = isPast || cell > maxD;
                return (
                  <TouchableOpacity
                    key={mi}
                    disabled={blocked}
                    style={[s.monthBtn, blocked && s.monthBtnDisabled]}
                    onPress={() => {
                      onChange(toLastDayISO(year, mi));
                      setOpen(false);
                    }}
                  >
                    <Text style={[s.monthBtnText, blocked && s.monthBtnTextDisabled]}>{mName}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={s.expiryHint}>התוקף נקבע ליום האחרון בחודש שנבחר</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (C) =>
  StyleSheet.create({
    fieldWrap: { marginBottom: 12 },
    label: { fontSize: 12, fontWeight: '600', color: C.textSecondary, textAlign: 'right', marginBottom: 5 },
    select: {
      flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12,
    },
    selectText: { fontSize: 15, color: C.text, fontWeight: '600' },
    selectPlaceholder: { color: C.mutedLt, fontWeight: '400' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 34 },
    modalHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 14 },
    modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: C.text },

    yearRow: { flexDirection: 'row-reverse', gap: 8 },
    yearChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border },
    yearChipActive: { backgroundColor: C.black, borderColor: C.black },
    yearChipText: { fontSize: 14, fontWeight: '700', color: C.text },
    yearChipTextActive: { color: C.white },

    monthGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    monthBtn: { width: '31%', paddingVertical: 12, borderRadius: 10, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
    monthBtnDisabled: { opacity: 0.35 },
    monthBtnText: { fontSize: 14, fontWeight: '700', color: C.text },
    monthBtnTextDisabled: { color: C.mutedLt },

    expiryHint: { fontSize: 12, color: C.mutedLt, textAlign: 'center', marginTop: 14 },
  });
