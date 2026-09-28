import { useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Alert, Switch, Modal, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text, TextInput } from '../../src/components/ScaledText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUser, updateShooterProfile } from '../../src/services/auth';
import { useTheme } from '../../src/context/ThemeContext';
import { GUN_DB, MANUFACTURERS, OPTICS_DB, OPTICS_BRANDS, OTHER } from '../../src/constants/guns';

// יומן היורים נכתב בעברית, ולכן גם השם. מותרים רווח, מקף וגרש.
const HEBREW_NAME_RE = /^[א-ת][א-ת\s'"׳״\-–—]*$/;

const HEB_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
// Expiry = last day of the chosen month (Feb/leap handled by Date automatically)
const lastDayOfMonth = (year, month1) => new Date(year, month1, 0).getDate();
function fmtExpiry(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const GEAR = [
  { key: 'holster_internal', label: 'נרתיק פנימי' },
  { key: 'holster_external', label: 'נרתיק חיצוני' },
  { key: 'holster_appendix', label: 'נרתיק אפנדיקס' },
  { key: 'carry_pouch', label: 'פאוץ נשיאה לאקדח' },
  { key: 'mag_pouch', label: 'פונדת מחסניות' },
  { key: 'id_cap', label: 'כובע זיהוי' },
  { key: 'conversion_kit', label: 'ערכת הסבה' },
];

export default function ShooterScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // personal + license
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [weaponSerial, setWeaponSerial] = useState('');

  // gun
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [hasOptic, setHasOptic] = useState(false);
  const [opticBrand, setOpticBrand] = useState('');
  const [opticModel, setOpticModel] = useState('');
  // "אחר" בבורר = הקלדה חופשית. המצב נשמר בנפרד מהערך: כשהוא נגזר מהערך
  // עצמו, שדה ההקלדה נעלם אחרי התו הראשון (משוב משתמשים 22/09/2026 — "כוונת חדשה: לא ניתן להוסיף").
  const [manualMan, setManualMan] = useState(false);
  const [manualModel, setManualModel] = useState(false);
  const [manualOpticBrand, setManualOpticBrand] = useState(false);
  const [manualOpticModel, setManualOpticModel] = useState(false);
  const [magCount, setMagCount] = useState('');
  const [magRounds, setMagRounds] = useState([]); // array of strings
  const [gear, setGear] = useState({});

  // pickers
  const [pickerMode, setPickerMode] = useState(null); // 'manufacturer' | 'model' | null
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [pyYear, setPyYear] = useState(new Date().getFullYear());

  useFocusEffect(useCallback(() => {
    (async () => {
      const u = await getUser();
      if (u) {
        setFirstName(u.first_name || (u.full_name || '').split(' ')[0] || '');
        setLastName(u.last_name || (u.full_name || '').split(' ').slice(1).join(' ') || '');
        setNationalId(u.national_id || u.id_number || '');
        setLicenseNumber(u.license_number || u.weapon_license_number || '');
        setLicenseExpiry(u.license_expiry || u.weapon_license_expiry || '');
        setWeaponSerial(u.weapon_serial || u.weapon_serial_number || '');
        const eq = u.equipment || {};
        const gm = eq.gun_manufacturer || '';
        const gmodel = eq.gun_model || '';
        setManufacturer(gm);
        setModel(gmodel);
        // ערך שמור שלא נמצא ברשימות = הוקלד ידנית, ונפתח שוב כשדה הקלדה
        const gmManual = !!gm && !GUN_DB[gm];
        setManualMan(gmManual);
        setManualModel(!!gmodel && !gmManual && !(GUN_DB[gm] || []).includes(gmodel));
        setHasOptic(!!eq.has_optic);
        const ob = eq.optic_brand || '';
        const om = eq.optic_model || '';
        setOpticBrand(ob);
        setOpticModel(om);
        const obManual = !!ob && !OPTICS_DB[ob];
        setManualOpticBrand(obManual);
        setManualOpticModel(!!om && !obManual && !(OPTICS_DB[ob] || []).includes(om));
        const mags = Array.isArray(eq.magazines) ? eq.magazines : [];
        setMagCount(mags.length ? String(mags.length) : '');
        setMagRounds(mags.map(m => String(m ?? '')));
        setGear({
          holster_internal: !!eq.holster_internal,
          holster_external: !!eq.holster_external,
          holster_appendix: !!eq.holster_appendix,
          carry_pouch: !!eq.carry_pouch,
          mag_pouch: !!eq.mag_pouch,
          id_cap: !!eq.id_cap,
          conversion_kit: !!eq.conversion_kit,
        });
      }
      setLoading(false);
    })();
  }, []));

  const onMagCountChange = (txt) => {
    const n = Math.max(0, Math.min(20, parseInt(txt.replace(/\D/g, '')) || 0));
    setMagCount(txt.replace(/\D/g, ''));
    setMagRounds(prev => {
      const next = [...prev];
      next.length = n;
      for (let i = 0; i < n; i++) if (next[i] == null) next[i] = '';
      return next;
    });
  };

  const setRounds = (i, val) => {
    setMagRounds(prev => { const next = [...prev]; next[i] = val.replace(/\D/g, ''); return next; });
  };

  const pickManufacturer = (m) => {
    // "אחר" → שדה הקלדה חופשית (עובד באייפון ובאנדרואיד)
    setManualMan(m === OTHER);
    setManufacturer(m === OTHER ? '' : m);
    setModel('');
    setManualModel(false);
    setPickerMode(null);
  };

  const pickModel = (m) => {
    setManualModel(m === OTHER);
    setModel(m === OTHER ? '' : m);
    setPickerMode(null);
  };

  const handleSave = async () => {
    // השם נרשם ביומן היורים כפי שהוא, והיומן בעברית — לכן עברית בלבד.
    const fn = firstName.trim();
    const ln = lastName.trim();
    if ((fn && !HEBREW_NAME_RE.test(fn)) || (ln && !HEBREW_NAME_RE.test(ln))) {
      Alert.alert('שגיאה', 'יש להזין את השם באותיות עברית — כך הוא נרשם ביומן היורים');
      return;
    }
    setSaving(true);
    try {
      await updateShooterProfile({
        first_name: fn,
        last_name: ln,
        national_id: nationalId.trim(),
        license_number: licenseNumber.trim(),
        license_expiry: licenseExpiry.trim(),
        weapon_serial: weaponSerial.trim(),
        equipment: {
          gun_manufacturer: manufacturer.trim(),
          gun_model: model.trim(),
          has_optic: hasOptic,
          optic_brand: hasOptic ? opticBrand.trim() : '',
          optic_model: hasOptic ? opticModel.trim() : '',
          magazines: magRounds.map(r => parseInt(r) || 0),
          ...gear,
        },
      });
      Alert.alert('נשמר', 'פרטי היורה והציוד עודכנו במערכת', [{ text: 'סבבה', onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert('שגיאה', e.message);
    } finally { setSaving(false); }
  };

  if (loading) {
    return <View style={s.loader}><ActivityIndicator size="large" color={C.black} /></View>;
  }

  const models = (!manualMan && GUN_DB[manufacturer]) ? GUN_DB[manufacturer] : [];
  const opticModels = (!manualOpticBrand && OPTICS_DB[opticBrand]) ? OPTICS_DB[opticBrand] : [];

  const pickerList = pickerMode === 'manufacturer' ? MANUFACTURERS
    : pickerMode === 'model' ? models
    : pickerMode === 'optic_brand' ? OPTICS_BRANDS
    : pickerMode === 'optic_model' ? opticModels : [];
  const onPick = (item) => {
    if (pickerMode === 'manufacturer') pickManufacturer(item);
    else if (pickerMode === 'model') pickModel(item);
    else if (pickerMode === 'optic_brand') { setManualOpticBrand(item === OTHER); setOpticBrand(item === OTHER ? '' : item); setOpticModel(''); setManualOpticModel(false); setPickerMode(null); }
    else if (pickerMode === 'optic_model') { setManualOpticModel(item === OTHER); setOpticModel(item === OTHER ? '' : item); setPickerMode(null); }
  };
  const pickerTitle = pickerMode === 'manufacturer' ? 'בחר יצרן'
    : pickerMode === 'model' ? 'בחר דגם'
    : pickerMode === 'optic_brand' ? 'בחר יצרן כוונת' : 'בחר דגם כוונת';

  return (
    <>
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        style={s.container}
        contentContainerStyle={[s.content, {
        paddingTop: insets.top + 12,
        // סרגל הלשוניות מרחף מעל התוכן: 57 פיקסלים לסרגל, 24 לכפתור
        // הבית שבולט מעליו, ועוד אוויר. ריווח קבוע של 40 היה קטן
        // מהסרגל עצמו, ולכן הכרטיס האחרון בכל מסך נחתך מתחתיו.
        paddingBottom: insets.bottom + 96,
      }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-forward" size={26} color={C.text} /></TouchableOpacity>
          <Text style={s.title}>פרטי יורה וציוד</Text>
        </View>

        {/* Personal + license */}
        <Text style={s.section}>פרטי יורה</Text>
        <Field s={s} label="שם פרטי (בעברית)" value={firstName} onChangeText={setFirstName} />
        <Field s={s} label="שם משפחה (בעברית)" value={lastName} onChangeText={setLastName} />
        <Field s={s} label="מספר תעודת זהות" value={nationalId} onChangeText={setNationalId} keyboardType="number-pad" />
        <Field s={s} label="מספר רישיון נשק" value={licenseNumber} onChangeText={setLicenseNumber} />

        <View style={s.fieldWrap}>
          <Text style={s.label}>תוקף רישיון (חודש ושנה)</Text>
          <TouchableOpacity style={s.select} onPress={() => { setPyYear(licenseExpiry ? +licenseExpiry.slice(0, 4) : new Date().getFullYear()); setExpiryOpen(true); }} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={18} color={C.muted} />
            <Text style={[s.selectText, !licenseExpiry && s.selectPlaceholder]}>
              {licenseExpiry ? fmtExpiry(licenseExpiry) : 'בחר חודש ושנה'}
            </Text>
          </TouchableOpacity>
        </View>

        <Field s={s} label="מספר טבוע על הכלי" value={weaponSerial} onChangeText={setWeaponSerial} />

        {/* Gun */}
        <Text style={s.section}>האקדח שלי</Text>
        <Text style={s.label}>סוג אקדח (יצרן)</Text>
        <TouchableOpacity style={s.select} onPress={() => setPickerMode('manufacturer')} activeOpacity={0.7}>
          <Ionicons name="chevron-down" size={18} color={C.muted} />
          <Text style={[s.selectText, !manufacturer && s.selectPlaceholder]}>
            {manualMan ? 'אחר' : (manufacturer || 'בחר יצרן')}
          </Text>
        </TouchableOpacity>
        {manualMan && (
          <TextInput style={s.input} placeholder="הקלד שם יצרן" placeholderTextColor={C.mutedLt}
            value={manufacturer}
            onChangeText={setManufacturer} textAlign="right" />
        )}

        {(manufacturer && !manualMan) && (
          <>
            <Text style={s.label}>דגם</Text>
            <TouchableOpacity style={s.select} onPress={() => setPickerMode('model')} activeOpacity={0.7}>
              <Ionicons name="chevron-down" size={18} color={C.muted} />
              <Text style={[s.selectText, !model && s.selectPlaceholder]}>
                {manualModel ? 'אחר' : (model || 'בחר דגם')}
              </Text>
            </TouchableOpacity>
          </>
        )}
        {(manualMan || manualModel) && (
          <TextInput style={s.input} placeholder="הקלד דגם" placeholderTextColor={C.mutedLt}
            value={model}
            onChangeText={setModel} textAlign="right" />
        )}

        {/* Optic (red dot) */}
        <View style={[s.gearRow, s.opticToggle]}>
          <Switch value={hasOptic} onValueChange={setHasOptic}
            trackColor={{ true: C.black, false: C.border }} thumbColor={C.white} />
          <Text style={s.gearLabel}>האם יש כוונת השלכה?</Text>
        </View>

        {hasOptic && (
          <>
            <Text style={s.label}>יצרן הכוונת</Text>
            <TouchableOpacity style={s.select} onPress={() => setPickerMode('optic_brand')} activeOpacity={0.7}>
              <Ionicons name="chevron-down" size={18} color={C.muted} />
              <Text style={[s.selectText, !opticBrand && s.selectPlaceholder]}>
                {manualOpticBrand ? 'אחר' : (opticBrand || 'בחר יצרן כוונת')}
              </Text>
            </TouchableOpacity>
            {manualOpticBrand && (
              <TextInput style={s.input} placeholder="הקלד יצרן כוונת" placeholderTextColor={C.mutedLt}
                value={opticBrand}
                onChangeText={setOpticBrand} textAlign="right" />
            )}
            {(opticBrand && !manualOpticBrand) && (
              <>
                <Text style={s.label}>דגם הכוונת</Text>
                <TouchableOpacity style={s.select} onPress={() => setPickerMode('optic_model')} activeOpacity={0.7}>
                  <Ionicons name="chevron-down" size={18} color={C.muted} />
                  <Text style={[s.selectText, !opticModel && s.selectPlaceholder]}>
                    {manualOpticModel ? 'אחר' : (opticModel || 'בחר דגם כוונת')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {(manualOpticBrand || manualOpticModel) && (
              <TextInput style={s.input} placeholder="הקלד דגם כוונת" placeholderTextColor={C.mutedLt}
                value={opticModel}
                onChangeText={setOpticModel} textAlign="right" />
            )}
          </>
        )}

        {/* Magazines */}
        <Text style={s.section}>מחסניות</Text>
        <Field s={s} label="כמות מחסניות" value={magCount} onChangeText={onMagCountChange} keyboardType="number-pad" placeholder="לדוגמה: 2" />
        {magRounds.map((r, i) => (
          <Field key={i} s={s} label={`מחסנית ${i + 1} — כמות כדורים`} value={r} onChangeText={(v) => setRounds(i, v)} keyboardType="number-pad" />
        ))}

        {/* Gear yes/no */}
        <Text style={s.section}>ציוד</Text>
        <View style={s.gearGroup}>
          {GEAR.map((g, idx) => (
            <View key={g.key} style={[s.gearRow, idx < GEAR.length - 1 && s.gearRowBorder]}>
              <Switch
                value={!!gear[g.key]}
                onValueChange={(v) => setGear(prev => ({ ...prev, [g.key]: v }))}
                trackColor={{ true: C.black, false: C.border }}
                thumbColor={C.white}
              />
              <Text style={s.gearLabel}>{g.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
          {saving ? <ActivityIndicator color={C.white} /> : <Text style={s.saveBtnText}>שמירה</Text>}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Picker modal */}
      <Modal visible={!!pickerMode} animationType="slide" transparent onRequestClose={() => setPickerMode(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setPickerMode(null)}><Ionicons name="close" size={24} color={C.muted} /></TouchableOpacity>
              <Text style={s.modalTitle}>{pickerTitle}</Text>
            </View>
            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              {pickerList.map(item => (
                <TouchableOpacity key={item} style={s.pickItem} onPress={() => onPick(item)}>
                  <Text style={[s.pickText, item === OTHER && s.pickOther]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Expiry month/year picker */}
      <Modal visible={expiryOpen} animationType="slide" transparent onRequestClose={() => setExpiryOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setExpiryOpen(false)}><Ionicons name="close" size={24} color={C.muted} /></TouchableOpacity>
              <Text style={s.modalTitle}>תוקף רישיון</Text>
            </View>

            {/* Year chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={s.yearRow}>
                {/* Licenses are valid up to ~3 years — allow up to 4 years ahead */}
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(y => (
                  <TouchableOpacity key={y} style={[s.yearChip, pyYear === y && s.yearChipActive]} onPress={() => setPyYear(y)}>
                    <Text style={[s.yearChipText, pyYear === y && s.yearChipTextActive]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Month grid */}
            <View style={s.monthGrid}>
              {HEB_MONTHS.map((mName, mi) => {
                const now = new Date();
                // Blocked if in the past, OR beyond exactly 4 years from today
                const maxD = new Date(now.getFullYear() + 4, now.getMonth(), 1);
                const cell = new Date(pyYear, mi, 1);
                const isPast = cell < new Date(now.getFullYear(), now.getMonth(), 1);
                const isTooFar = cell > maxD;
                const blocked = isPast || isTooFar;
                return (
                  <TouchableOpacity key={mi} disabled={blocked}
                    style={[s.monthBtn, blocked && s.monthBtnDisabled]}
                    onPress={() => {
                      const iso = `${pyYear}-${pad2(mi + 1)}-${pad2(lastDayOfMonth(pyYear, mi + 1))}`;
                      setLicenseExpiry(iso);
                      setExpiryOpen(false);
                    }}>
                    <Text style={[s.monthBtnText, blocked && s.monthBtnTextDisabled]}>{mName}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={s.expiryHint}>התוקף נקבע ליום האחרון בחודש שנבחר</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Field({ s, label, ...props }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} textAlign="right" placeholderTextColor={s._mutedLt} {...props} />
    </View>
  );
}

const makeStyles = (C) => {
  const st = StyleSheet.create({
    loader: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: C.bg },
    content: { padding: 20, paddingBottom: 50 },
    topBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 20 },
    title: { fontSize: 22, fontWeight: '800', color: C.text },
    section: { fontSize: 14, fontWeight: '800', color: C.text, textAlign: 'right', marginTop: 22, marginBottom: 10 },
    fieldWrap: { marginBottom: 12 },
    label: { fontSize: 12, fontWeight: '600', color: C.textSecondary, textAlign: 'right', marginBottom: 5 },
    input: {
      backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, marginBottom: 4,
    },
    select: {
      flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12,
    },
    selectText: { fontSize: 15, color: C.text, fontWeight: '600' },
    selectPlaceholder: { color: C.mutedLt, fontWeight: '400' },

    gearGroup: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12, overflow: 'hidden' },
    gearRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    gearRowBorder: { borderBottomWidth: 1, borderBottomColor: C.borderLt },
    opticToggle: { backgroundColor: C.cardAlt, borderRadius: 10, marginBottom: 12, marginTop: 4 },
    gearLabel: { fontSize: 15, fontWeight: '600', color: C.text },

    saveBtn: { backgroundColor: C.black, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
    saveBtnText: { fontSize: 16, fontWeight: '800', color: C.white },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 34 },
    modalHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 14 },
    modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: C.text },
    pickItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.borderLt },
    pickText: { fontSize: 15, color: C.text, textAlign: 'right', fontWeight: '600' },
    pickOther: { color: C.accent2, fontWeight: '700' },

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
  st._mutedLt = C.mutedLt;
  return st;
};
