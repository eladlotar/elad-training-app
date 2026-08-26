/**
 * FolderScreen — "התיקייה שלי": אסמכתאות ריענון, קבלות ומסמכים מהמטווח.
 *
 * ⚠️ שוכתב 24/08/2026. הגרסה הקודמת שמרה הכל **רק על המכשיר**: הקובץ הועתק
 * ל-documentDirectory/elad_folder/ והרשימה ישבה ב-AsyncStorage. באפליקציה זה
 * שרד (בפורטל ספארי מחק את הכל אחרי 7 ימים — ראה CustomerFolder.jsx), אבל
 * עדיין: אפס גיבוי, אפס סנכרון בין מכשירים, ואלעד לא ראה את האסמכתאות.
 * מתאמן שמחק את האפליקציה או החליף טלפון — איבד מסמכים מול משרד הפנים.
 *
 * עכשיו הכל בשרת (CustomerDocument דרך mobileAppApi).
 *
 * העברה חד-פעמית: בכניסה הראשונה אחרי העדכון, כל קובץ שעדיין קיים במכשיר
 * נדחף לשרת עם local_id שמונע כפילות. **הקבצים המקומיים לא נמחקים** —
 * רק מפתח הרשימה ב-AsyncStorage, וגם הוא רק אם כל התמונות עברו בהצלחה.
 * מסמך שאי אפשר להחזיר לא מוחקים על סמך תשובת רשת אחת.
 *
 * שינוי ג'אווהסקריפט בלבד — אין רכיב מערכת חדש, ולכן זה מגיע בעדכון אוויר.
 */
import { useState, useCallback, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Image, Alert, Modal, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text, TextInput } from '../../src/components/ScaledText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../../src/context/ThemeContext';
import { getUser } from '../../src/services/auth';
import {
  listMyDocuments, uploadMyDocument, updateMyDocument, deleteMyDocument,
} from '../../src/services/documents';

const DIR = FileSystem.documentDirectory + 'elad_folder/';
const legacyKey = (uid) => `elad_folder_${uid || 'guest'}`;
const COLS = 2;
const GAP = 12;
const SCREEN_W = Dimensions.get('window').width;
// Percentage heights are unreliable inside a ScrollView content container,
// so the viewer image is capped against the real window height instead.
const SCREEN_H = Dimensions.get('window').height;
const THUMB = (SCREEN_W - 40 - GAP) / COLS;

function fmtLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function FolderScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);
  const insets = useSafeAreaInsets();
  const [uid, setUid] = useState('guest');
  const [docs, setDocs] = useState([]);
  const [maxDocs, setMaxDocs] = useState(100);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [migrating, setMigrating] = useState(0);
  const [viewDoc, setViewDoc] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const migratedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const { documents, maxDocs: cap } = await listMyDocuments();
      setDocs(documents);
      setMaxDocs(cap);
      return documents;
    } catch (e) {
      // כשל רשת — לא מרוקנים את המסך, משאירים את מה שכבר מוצג
      console.warn('[folder] load failed:', e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * דחיפה חד-פעמית של מה ששמור במכשיר. רצה רק אחרי שהרשימה מהשרת נטענה,
   * כדי שהמזהים המקומיים יושוו נכון ולא ייווצרו עותקים.
   */
  const migrateLocal = useCallback(async (id, serverDocs) => {
    if (migratedRef.current) return;
    migratedRef.current = true;
    let legacy = [];
    try {
      const raw = await AsyncStorage.getItem(legacyKey(id));
      legacy = raw ? JSON.parse(raw) : [];
    } catch { return; }
    if (!Array.isArray(legacy) || legacy.length === 0) return;

    const known = new Set((serverDocs || []).map((d) => d.local_id).filter(Boolean));
    const pending = legacy.filter((d) => d?.uri && !known.has(String(d.id)));
    if (pending.length === 0) {
      try { await AsyncStorage.removeItem(legacyKey(id)); } catch { /* ignore */ }
      return;
    }

    setMigrating(pending.length);
    let failed = 0;
    for (const d of pending) {
      try {
        const b64 = await FileSystem.readAsStringAsync(d.uri, { encoding: 'base64' });
        await uploadMyDocument({
          dataB64: b64,
          mimeType: 'image/jpeg',
          title: d.title || '',
          fileName: `folder_${d.id}.jpg`,
          localId: String(d.id),
          capturedAt: d.createdAt || null,
          source: 'migrated',
        });
      } catch (e) {
        console.warn('[folder] migrate failed for', d.id, e.message);
        failed++;
      }
      setMigrating((n) => Math.max(0, n - 1));
    }
    // הקבצים עצמם נשארים על המכשיר בכוונה. מוחקים רק את הרשימה, ורק
    // אם הכל עבר — אחרת ההעברה תנסה שוב בכניסה הבאה.
    if (failed === 0) {
      try { await AsyncStorage.removeItem(legacyKey(id)); } catch { /* ignore */ }
    }
    setMigrating(0);
    await load();
  }, [load]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const u = await getUser();
      const id = u?.id || 'guest';
      setUid(id);
      try { await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }); } catch {}
      const serverDocs = await load();
      if (serverDocs !== null) await migrateLocal(id, serverDocs);
    })();
  }, [load, migrateLocal]));

  const addFromResult = async (result) => {
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('שגיאה', 'לא ניתן לקרוא את התמונה');
      return;
    }
    setBusy(true);
    try {
      await uploadMyDocument({
        dataB64: asset.base64,
        mimeType: 'image/jpeg',
        fileName: asset.fileName || '',
        source: 'app',
      });
      await load();
    } catch (e) {
      Alert.alert('שגיאה', e.message || 'לא ניתן לשמור את התמונה');
    } finally { setBusy(false); }
  };

  const takePhoto = async () => {
    if (docs.length >= maxDocs) return limitAlert();
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('נדרשת הרשאה', 'יש לאשר גישה למצלמה בהגדרות הטלפון'); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
    await addFromResult(res);
  };

  const pickImage = async () => {
    if (docs.length >= maxDocs) return limitAlert();
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7, base64: true, mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    await addFromResult(res);
  };

  const limitAlert = () => Alert.alert('התיקייה מלאה', `ניתן לשמור עד ${maxDocs} מסמכים. מחק כדי להוסיף חדשים.`);

  const openDoc = (doc) => { setViewDoc(doc); setEditTitle(doc.title || ''); };

  const saveTitle = async () => {
    if (!viewDoc) return;
    const t = editTitle.trim();
    setDocs((prev) => prev.map((d) => (d.id === viewDoc.id ? { ...d, title: t } : d)));
    setViewDoc({ ...viewDoc, title: t });
    try { await updateMyDocument(viewDoc.id, t); }
    catch (e) { Alert.alert('שגיאה', e.message || 'שמירת הכותרת נכשלה'); }
  };

  const deleteDoc = () => {
    Alert.alert('מחיקת תמונה', 'למחוק את התמונה מהתיקייה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק', style: 'destructive',
        onPress: async () => {
          const id = viewDoc.id;
          setViewDoc(null);
          setDocs((prev) => prev.filter((d) => d.id !== id));
          try { await deleteMyDocument(id); }
          catch (e) { Alert.alert('שגיאה', e.message || 'המחיקה נכשלה'); await load(); }
        },
      },
    ]);
  };

  return (
    <>
      <ScrollView style={s.container} contentContainerStyle={[s.content, {
        paddingTop: insets.top + 12,
        // סרגל הלשוניות מרחף מעל התוכן: 57 פיקסלים לסרגל, 24 לכפתור
        // הבית שבולט מעליו, ועוד אוויר. ריווח קבוע של 40 היה קטן
        // מהסרגל עצמו, ולכן הכרטיס האחרון בכל מסך נחתך מתחתיו.
        paddingBottom: insets.bottom + 96,
      }]}>
        <Text style={s.title}>התיקייה שלי</Text>
        <Text style={s.sub}>אסמכתאות ריענון, קבלות ומסמכים מהמטווח — שמורים בענן ({docs.length}/{maxDocs})</Text>

        {migrating > 0 && (
          <View style={s.migrate}>
            <ActivityIndicator size="small" color={C.black} />
            <Text style={s.migrateText}>
              מעבירים את התמונות שלך לשמירה בענן — נשארו {migrating}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity style={s.actionBtn} onPress={takePhoto} activeOpacity={0.8} disabled={busy || migrating > 0}>
            <Ionicons name="camera" size={22} color={C.white} />
            <Text style={s.actionText}>צילום תמונה</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, s.actionBtnAlt]} onPress={pickImage} activeOpacity={0.8} disabled={busy || migrating > 0}>
            <Ionicons name="image" size={22} color={C.text} />
            <Text style={[s.actionText, s.actionTextAlt]}>העלאה מהגלריה</Text>
          </TouchableOpacity>
        </View>

        {(busy || loading) && <ActivityIndicator style={{ marginVertical: 16 }} color={C.black} />}

        {/* Grid */}
        {!loading && docs.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="folder-open-outline" size={40} color={C.mutedLt} />
            <Text style={s.emptyText}>עוד אין מסמכים בתיקייה</Text>
            <Text style={s.emptyHint}>צלם או העלה אסמכתאות שקיבלת במטווח</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {docs.map(doc => (
              <TouchableOpacity key={doc.id} style={s.thumbCard} onPress={() => openDoc(doc)} activeOpacity={0.85}>
                <Image source={{ uri: doc.url }} style={s.thumb} />
                <View style={s.thumbInfo}>
                  <Text style={s.thumbTitle} numberOfLines={1}>{doc.title || 'ללא כותרת'}</Text>
                  <Text style={s.thumbDate}>{fmtLabel(doc.created_at)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Viewer modal */}
      <Modal visible={!!viewDoc} animationType="slide" onRequestClose={() => setViewDoc(null)}>
        {viewDoc && (
          <KeyboardAvoidingView
            style={[s.viewer, { paddingTop: insets.top + 8 }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={s.viewerBar}>
              <TouchableOpacity
                onPress={() => setViewDoc(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={28} color={C.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={deleteDoc}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 16 }}
              >
                <Ionicons name="trash-outline" size={24} color={C.err} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={s.viewerBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <Image source={{ uri: viewDoc.url }} style={s.viewerImg} resizeMode="contain" />
              <Text style={s.viewerDate}>נשמר: {fmtLabel(viewDoc.created_at)}</Text>
              <Text style={s.viewerLabel}>כותרת</Text>
              <TextInput style={s.viewerInput} value={editTitle} onChangeText={setEditTitle}
                placeholder="למשל: אסמכתת ריענון 07/2026" placeholderTextColor={C.mutedLt} textAlign="right" />
              <TouchableOpacity style={s.viewerSave} onPress={saveTitle} activeOpacity={0.8}>
                <Text style={s.viewerSaveText}>שמירת כותרת</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Modal>
    </>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: C.text, textAlign: 'right' },
  sub: { fontSize: 13, color: C.muted, textAlign: 'right', marginTop: 4, marginBottom: 18 },

  migrate: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 14 },
  migrateText: { flex: 1, fontSize: 12.5, color: C.textSecondary, textAlign: 'right' },

  actions: { flexDirection: 'row-reverse', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row-reverse', gap: 8, backgroundColor: C.black, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  actionBtnAlt: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border },
  actionText: { fontSize: 14, fontWeight: '700', color: C.white },
  actionTextAlt: { color: C.text },

  empty: { alignItems: 'center', gap: 8, marginTop: 60, backgroundColor: C.cardAlt, borderRadius: 16, padding: 36 },
  emptyText: { fontSize: 15, fontWeight: '700', color: C.text },
  emptyHint: { fontSize: 13, color: C.muted },

  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: GAP, marginTop: 18 },
  thumbCard: { width: THUMB, borderRadius: 12, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  thumb: { width: '100%', height: THUMB, backgroundColor: C.borderLt },
  thumbInfo: { padding: 8, alignItems: 'flex-end' },
  thumbTitle: { fontSize: 12, fontWeight: '700', color: C.text, width: '100%', textAlign: 'right' },
  thumbDate: { fontSize: 10, color: C.muted, marginTop: 2 },

  viewer: { flex: 1, backgroundColor: C.bg },
  viewerBar: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  viewerBody: { padding: 20 },
  viewerImg: { width: '100%', height: Math.round(SCREEN_H * 0.42), borderRadius: 12, backgroundColor: C.cardAlt },
  viewerDate: { fontSize: 12, color: C.muted, textAlign: 'right', marginTop: 12 },
  viewerLabel: { fontSize: 13, fontWeight: '700', color: C.textSecondary, textAlign: 'right', marginTop: 16, marginBottom: 6 },
  viewerInput: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text },
  viewerSave: { backgroundColor: C.black, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  viewerSaveText: { fontSize: 15, fontWeight: '800', color: C.white },
});
