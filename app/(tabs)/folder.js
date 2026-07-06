import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, Alert, Modal, TextInput, ActivityIndicator, Dimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../../src/context/ThemeContext';
import { getUser } from '../../src/services/auth';

const MAX_DOCS = 20;
const DIR = FileSystem.documentDirectory + 'elad_folder/';
const metaKey = (uid) => `elad_folder_${uid || 'guest'}`;
const COLS = 2;
const GAP = 12;
const SCREEN_W = Dimensions.get('window').width;
const THUMB = (SCREEN_W - 40 - GAP) / COLS;

function nowStamp() {
  const d = new Date();
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return { iso: d.toISOString(), label: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}` };
}

export default function FolderScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);
  const [uid, setUid] = useState('guest');
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const load = async (id) => {
    try {
      const raw = await AsyncStorage.getItem(metaKey(id));
      setDocs(raw ? JSON.parse(raw) : []);
    } catch { setDocs([]); }
  };

  useFocusEffect(useCallback(() => {
    (async () => {
      const u = await getUser();
      const id = u?.id || 'guest';
      setUid(id);
      try { await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }); } catch {}
      await load(id);
    })();
  }, []));

  const persist = async (next) => {
    setDocs(next);
    try { await AsyncStorage.setItem(metaKey(uid), JSON.stringify(next)); } catch {}
  };

  const addFromResult = async (result) => {
    if (result.canceled || !result.assets?.length) return;
    setBusy(true);
    try {
      const asset = result.assets[0];
      const id = `${Date.now()}`;
      const dest = `${DIR}${id}.jpg`;
      await FileSystem.copyAsync({ from: asset.uri, to: dest });
      const st = nowStamp();
      const next = [{ id, uri: dest, title: '', createdAt: st.iso, createdLabel: st.label }, ...docs];
      await persist(next);
    } catch (e) {
      Alert.alert('שגיאה', 'לא ניתן לשמור את התמונה');
    } finally { setBusy(false); }
  };

  const takePhoto = async () => {
    if (docs.length >= MAX_DOCS) return limitAlert();
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('נדרשת הרשאה', 'יש לאשר גישה למצלמה בהגדרות הטלפון'); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    await addFromResult(res);
  };

  const pickImage = async () => {
    if (docs.length >= MAX_DOCS) return limitAlert();
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    await addFromResult(res);
  };

  const limitAlert = () => Alert.alert('התיקייה מלאה', `ניתן לשמור עד ${MAX_DOCS} תמונות. מחק תמונות כדי להוסיף חדשות.`);

  const openDoc = (doc) => { setViewDoc(doc); setEditTitle(doc.title || ''); };

  const saveTitle = async () => {
    const next = docs.map(d => d.id === viewDoc.id ? { ...d, title: editTitle.trim() } : d);
    await persist(next);
    setViewDoc({ ...viewDoc, title: editTitle.trim() });
  };

  const deleteDoc = () => {
    Alert.alert('מחיקת תמונה', 'למחוק את התמונה מהתיקייה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק', style: 'destructive',
        onPress: async () => {
          try { await FileSystem.deleteAsync(viewDoc.uri, { idempotent: true }); } catch {}
          await persist(docs.filter(d => d.id !== viewDoc.id));
          setViewDoc(null);
        },
      },
    ]);
  };

  return (
    <>
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <Text style={s.title}>התיקייה שלי</Text>
        <Text style={s.sub}>אסמכתאות ריענון, קבלות ומסמכים מהמטווח — נשמרים אצלך ({docs.length}/{MAX_DOCS})</Text>

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity style={s.actionBtn} onPress={takePhoto} activeOpacity={0.8} disabled={busy}>
            <Ionicons name="camera" size={22} color={C.white} />
            <Text style={s.actionText}>צילום תמונה</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, s.actionBtnAlt]} onPress={pickImage} activeOpacity={0.8} disabled={busy}>
            <Ionicons name="image" size={22} color={C.text} />
            <Text style={[s.actionText, s.actionTextAlt]}>העלאה מהגלריה</Text>
          </TouchableOpacity>
        </View>

        {busy && <ActivityIndicator style={{ marginVertical: 16 }} color={C.black} />}

        {/* Grid */}
        {docs.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="folder-open-outline" size={40} color={C.mutedLt} />
            <Text style={s.emptyText}>עוד אין מסמכים בתיקייה</Text>
            <Text style={s.emptyHint}>צלם או העלה אסמכתאות שקיבלת במטווח</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {docs.map(doc => (
              <TouchableOpacity key={doc.id} style={s.thumbCard} onPress={() => openDoc(doc)} activeOpacity={0.85}>
                <Image source={{ uri: doc.uri }} style={s.thumb} />
                <View style={s.thumbInfo}>
                  <Text style={s.thumbTitle} numberOfLines={1}>{doc.title || 'ללא כותרת'}</Text>
                  <Text style={s.thumbDate}>{doc.createdLabel}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Viewer modal */}
      <Modal visible={!!viewDoc} animationType="slide" onRequestClose={() => setViewDoc(null)}>
        {viewDoc && (
          <View style={s.viewer}>
            <View style={s.viewerBar}>
              <TouchableOpacity onPress={() => setViewDoc(null)}><Ionicons name="close" size={28} color={C.text} /></TouchableOpacity>
              <TouchableOpacity onPress={deleteDoc}><Ionicons name="trash-outline" size={24} color={C.err} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.viewerBody}>
              <Image source={{ uri: viewDoc.uri }} style={s.viewerImg} resizeMode="contain" />
              <Text style={s.viewerDate}>נשמר: {viewDoc.createdLabel}</Text>
              <Text style={s.viewerLabel}>כותרת</Text>
              <TextInput style={s.viewerInput} value={editTitle} onChangeText={setEditTitle}
                placeholder="למשל: אסמכתת ריענון 07/2026" placeholderTextColor={C.mutedLt} textAlign="right" />
              <TouchableOpacity style={s.viewerSave} onPress={saveTitle} activeOpacity={0.8}>
                <Text style={s.viewerSaveText}>שמירת כותרת</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>
    </>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: C.text, textAlign: 'right' },
  sub: { fontSize: 13, color: C.muted, textAlign: 'right', marginTop: 4, marginBottom: 18 },

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

  viewer: { flex: 1, backgroundColor: C.bg, paddingTop: 50 },
  viewerBar: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  viewerBody: { padding: 20 },
  viewerImg: { width: '100%', height: 360, borderRadius: 12, backgroundColor: C.cardAlt },
  viewerDate: { fontSize: 12, color: C.muted, textAlign: 'right', marginTop: 12 },
  viewerLabel: { fontSize: 13, fontWeight: '700', color: C.textSecondary, textAlign: 'right', marginTop: 16, marginBottom: 6 },
  viewerInput: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text },
  viewerSave: { backgroundColor: C.black, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  viewerSaveText: { fontSize: 15, fontWeight: '800', color: C.white },
});
