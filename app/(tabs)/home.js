import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Image, Modal,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getUser, refreshMe } from '../../src/services/auth';
import { getSessions, getNextSession, getMyEnrollments } from '../../src/services/sessions';
import { getUserLevel, LEVELS } from '../../src/constants/levels';
import { useTheme } from '../../src/context/ThemeContext';

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'בוקר טוב';
  if (h < 17) return 'צהריים טובים';
  if (h < 21) return 'ערב טוב';
  return 'לילה טוב';
}

function getLicenseDaysLeft(expiryStr) {
  if (!expiryStr) return null;
  const now = new Date();
  const expiry = new Date(expiryStr);
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
}

function ProgressBar({ progress, label, s }) {
  return (
    <View style={s.progressRow}>
      <Text style={s.progressLabel}>{label}</Text>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
      </View>
      <Text style={s.progressPct}>{Math.round(progress * 100)}%</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);
  const [user, setUser] = useState(null);
  const [nextSession, setNextSession] = useState(null);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showLevels, setShowLevels] = useState(false);

  const loadData = async () => {
    let u = await getUser();
    // Refresh stats/credits from the server; on network failure keep cache
    try {
      const fresh = await refreshMe();
      if (fresh) u = fresh;
    } catch {}
    setUser(u);
    try { await getSessions(); } catch {}
    setNextSession(getNextSession());
    if (u?.id) {
      try {
        const enr = await getMyEnrollments();
        setMyEnrollments(enr);
      } catch {}
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const firstName = (user?.full_name || '').split(' ')[0] || 'מתאמן';
  const totalBullets = user?.total_bullets || 0;
  const totalSessions = user?.total_sessions || 0;
  const levelInfo = getUserLevel(totalBullets, totalSessions);
  const licenseDays = getLicenseDaysLeft(user?.weapon_license_expiry);

  return (
    <>
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.black} />}
    >
      {/* Header */}
      <View style={s.headerRow}>
        <Image
          source={require('../../assets/elad-logo.png')}
          style={s.logo}
          resizeMode="contain"
        />
        <View style={s.header}>
          <Text style={s.greeting}>{getGreeting()}</Text>
          <Text style={s.name}>{firstName}</Text>
        </View>
      </View>

      {/* Level Card */}
      <View style={s.levelCard}>
        <View style={s.levelHeader}>
          <TouchableOpacity style={s.levelBadge} onPress={() => setShowLevels(true)} activeOpacity={0.7}>
            <Text style={s.levelEmoji}>{levelInfo.current.emoji}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.levelInfo} onPress={() => setShowLevels(true)} activeOpacity={0.7}>
            <Text style={s.levelName}>{levelInfo.current.name}</Text>
            <View style={s.levelLabelRow}>
              <Text style={s.levelLabel}>רמה {levelInfo.current.level} · לחץ לכל הדרגות</Text>
              <Ionicons name="chevron-back" size={13} color={C.muted} />
            </View>
          </TouchableOpacity>
        </View>

        {levelInfo.next && (
          <View style={s.levelProgress}>
            <Text style={s.levelNextText}>
              עד רמה {levelInfo.next.level} - {levelInfo.next.name}
            </Text>
            <ProgressBar s={s}
              progress={levelInfo.bulletsProgress}
              label={`כדורים: ${totalBullets} / ${levelInfo.next.bullets}`}
            />
            <ProgressBar s={s}
              progress={levelInfo.sessionsProgress}
              label={`אימונים: ${totalSessions} / ${levelInfo.next.sessions}`}
            />
          </View>
        )}

        <View style={s.levelStatsRow}>
          <View style={s.levelStat}>
            <Text style={s.levelStatValue}>{totalBullets.toLocaleString()}</Text>
            <Text style={s.levelStatLabel}>סה"כ כדורים</Text>
          </View>
          <View style={s.levelStatDivider} />
          <View style={s.levelStat}>
            <Text style={s.levelStatValue}>{totalSessions}</Text>
            <Text style={s.levelStatLabel}>סה"כ אימונים</Text>
          </View>
        </View>
      </View>

      {/* Next Session */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>האימון הבא</Text>
        {nextSession ? (
          <View style={s.nextCard}>
            <View style={s.nextCardRight}>
              <Text style={s.nextTitle}>{nextSession.title}</Text>
              <Text style={s.nextMeta}>
                יום {DAY_NAMES[new Date(nextSession.date).getDay()]} | {nextSession.start_time} - {nextSession.end_time}
              </Text>
              <Text style={s.nextMeta}>{nextSession.location}</Text>
              <Text style={s.nextInstructor}>{nextSession.instructor_name}</Text>
            </View>
            <View style={s.nextCardLeft}>
              <Text style={s.nextDay}>{new Date(nextSession.date).getDate()}</Text>
              <Text style={s.nextMonth}>
                {new Date(nextSession.date).toLocaleDateString('he-IL', { month: 'short' })}
              </Text>
            </View>
          </View>
        ) : (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>אין אימון קרוב</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/sessions')}>
              <Text style={s.emptyLink}>קבע אימון</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Membership status */}
      <TouchableOpacity
        style={s.memberCard}
        onPress={() => router.push('/(tabs)/subscription')}
        activeOpacity={0.85}
      >
        <View style={[s.memberDot, user?.has_membership ? s.memberDotOn : s.memberDotOff]} />
        <View style={s.memberInfo}>
          <Text style={s.memberLabel}>סטטוס מנוי</Text>
          <Text style={s.memberValue}>
            {user?.has_membership ? (user.membership_products || []).join(' · ') : 'אין מנוי פעיל'}
          </Text>
          {user?.subscription?.usage_label ? (
            <Text style={s.memberUsage}>{user.subscription.usage_label}</Text>
          ) : null}
        </View>
        <Ionicons name={user?.has_membership ? 'ribbon' : 'ribbon-outline'} size={22} color={user?.has_membership ? C.black : C.mutedLt} />
      </TouchableOpacity>

      {/* My weapon */}
      {(user?.equipment?.gun_manufacturer || user?.weapon_type) && (
        <TouchableOpacity style={s.weaponCard} onPress={() => router.push('/(tabs)/shooter')} activeOpacity={0.85}>
          <View style={s.weaponIcon}><MaterialCommunityIcons name="pistol" size={26} color={C.white} /></View>
          <View style={s.weaponInfo}>
            <Text style={s.weaponLabel}>האקדח שלי</Text>
            <Text style={s.weaponName}>
              {user.equipment?.gun_manufacturer ? `${user.equipment.gun_manufacturer} ${user.equipment.gun_model || ''}`.trim() : user.weapon_type}
            </Text>
            {(() => {
              const eq = user.equipment || {};
              const mags = eq.magazines || [];
              const gearCount = ['holster_internal','holster_external','holster_appendix','carry_pouch','mag_pouch','id_cap','conversion_kit']
                .filter(k => eq[k]).length;
              const parts = [];
              if (mags.length) parts.push(`${mags.length} מחסניות · ${mags.reduce((a,b)=>a+(+b||0),0)} כדורים`);
              if (eq.has_optic && (eq.optic_brand || eq.optic_model)) parts.push(`כוונת: ${`${eq.optic_brand || ''} ${eq.optic_model || ''}`.trim()}`);
              if (gearCount) parts.push(`${gearCount} פריטי ציוד`);
              return parts.length ? <Text style={s.weaponMeta}>{parts.join('  ·  ')}</Text> : null;
            })()}
          </View>
          <Ionicons name="chevron-back" size={18} color={C.white} style={{ opacity: 0.7 }} />
        </TouchableOpacity>
      )}

      {/* Credits + License */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statValue}>
            {user?.credits_unlimited ? '∞' : (user?.remaining_credits || 0)}
          </Text>
          <Text style={s.statLabel}>קרדיטים</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[
            s.statValue,
            licenseDays !== null && licenseDays <= 30 && { color: C.warn },
            licenseDays !== null && licenseDays <= 7 && { color: C.err },
          ]}>{licenseDays !== null ? licenseDays : '-'}</Text>
          <Text style={s.statLabel}>ימים לרישיון</Text>
        </View>
      </View>

      {/* Book Button */}
      <TouchableOpacity
        style={s.bookBtn}
        onPress={() => router.push('/(tabs)/sessions')}
        activeOpacity={0.7}
      >
        <Text style={s.bookBtnText}>קבע אימון חדש</Text>
      </TouchableOpacity>

      {/* My Enrollments */}
      {myEnrollments.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>נרשמתי ({myEnrollments.length})</Text>
          {myEnrollments.map(e => (
            <View key={e.id} style={s.enrollCard}>
              <Text style={s.enrollTitle}>{e.session_title}</Text>
              <Text style={s.enrollMeta}>{e.session_date} | {e.session_time}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>

    {/* All ranks modal */}
    <Modal visible={showLevels} animationType="slide" transparent onRequestClose={() => setShowLevels(false)}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowLevels(false)}>
              <Ionicons name="close" size={24} color={C.muted} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>מסלול הדרגות</Text>
          </View>
          <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
            {[...LEVELS].reverse().map(lvl => {
              const isCurrent = lvl.level === levelInfo.current.level;
              const achieved = totalBullets >= lvl.bullets && totalSessions >= lvl.sessions;
              const bulletsLeft = Math.max(0, lvl.bullets - totalBullets);
              const sessionsLeft = Math.max(0, lvl.sessions - totalSessions);
              return (
                <View key={lvl.level} style={[s.rankRow, isCurrent && s.rankRowCurrent]}>
                  <View style={[s.rankEmojiWrap, achieved && s.rankEmojiWrapDone]}>
                    <Text style={s.rankEmoji}>{lvl.emoji}</Text>
                  </View>
                  <View style={s.rankInfo}>
                    <View style={s.rankTitleRow}>
                      {isCurrent && <View style={s.currentTag}><Text style={s.currentTagText}>הרמה שלך</Text></View>}
                      <Text style={s.rankName}>{lvl.name}</Text>
                    </View>
                    <Text style={s.rankReq}>
                      {lvl.bullets.toLocaleString()} כדורים · {lvl.sessions} אימונים
                    </Text>
                    {achieved ? (
                      <View style={s.rankDoneRow}>
                        <Text style={s.rankDoneText}>הושג</Text>
                        <Ionicons name="checkmark-circle" size={14} color={C.ok} />
                      </View>
                    ) : (
                      <Text style={s.rankLeft}>
                        חסר: {bulletsLeft > 0 ? `${bulletsLeft.toLocaleString()} כדורים` : ''}
                        {bulletsLeft > 0 && sessionsLeft > 0 ? ' · ' : ''}
                        {sessionsLeft > 0 ? `${sessionsLeft} אימונים` : ''}
                      </Text>
                    )}
                  </View>
                  <Text style={[s.rankNum, isCurrent && s.rankNumCurrent]}>{lvl.level}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
    </>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },

  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  header: { alignItems: 'flex-end' },
  greeting: { fontSize: 14, color: C.muted },
  name: { fontSize: 28, fontWeight: '800', color: C.text, marginTop: 2 },
  logo: { width: 92, height: 46 },

  // Level Card
  levelCard: {
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.black,
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
  },
  levelHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 14,
  },
  levelBadge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.cardAlt,
    borderWidth: 1.5, borderColor: C.black,
    justifyContent: 'center', alignItems: 'center',
  },
  levelEmoji: { fontSize: 24 },
  levelInfo: { flex: 1, marginRight: 12, alignItems: 'flex-end' },
  levelName: { fontSize: 20, fontWeight: '800', color: C.text },
  levelLabelRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3, marginTop: 2 },
  levelLabel: { fontSize: 12, color: C.muted },

  // Membership card
  memberCard: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 16, marginBottom: 16,
  },
  memberDot: { width: 10, height: 10, borderRadius: 5 },
  memberDotOn: { backgroundColor: C.ok },
  memberDotOff: { backgroundColor: C.mutedLt },
  memberInfo: { flex: 1, alignItems: 'flex-end' },
  memberLabel: { fontSize: 11, color: C.muted, fontWeight: '600' },
  memberValue: { fontSize: 15, fontWeight: '800', color: C.text, marginTop: 1 },
  memberUsage: { fontSize: 12, color: C.textSecondary, fontWeight: '600', marginTop: 3 },

  // Weapon card
  weaponCard: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    backgroundColor: C.black, borderRadius: 14, padding: 16, marginBottom: 16,
  },
  weaponIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  weaponEmoji: { fontSize: 24 },
  weaponInfo: { flex: 1, alignItems: 'flex-end' },
  weaponLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  weaponName: { fontSize: 17, fontWeight: '800', color: C.white, marginTop: 1 },
  weaponMeta: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },

  // Ranks modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 34 },
  modalHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 14 },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  rankRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.borderLt, gap: 12 },
  rankRowCurrent: { backgroundColor: C.cardAlt, borderRadius: 12, paddingHorizontal: 10, borderBottomWidth: 0, marginVertical: 2 },
  rankEmojiWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  rankEmojiWrapDone: { borderColor: C.ok, backgroundColor: C.okLt },
  rankEmoji: { fontSize: 22 },
  rankInfo: { flex: 1, alignItems: 'flex-end' },
  rankTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  rankName: { fontSize: 16, fontWeight: '800', color: C.text },
  currentTag: { backgroundColor: C.black, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  currentTagText: { fontSize: 10, fontWeight: '700', color: C.white },
  rankReq: { fontSize: 12, color: C.muted, marginTop: 2 },
  rankDoneRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 3 },
  rankDoneText: { fontSize: 11, fontWeight: '700', color: C.ok },
  rankLeft: { fontSize: 11, color: C.warn, fontWeight: '600', marginTop: 3 },
  rankNum: { fontSize: 18, fontWeight: '800', color: C.mutedLt, width: 22, textAlign: 'center' },
  rankNumCurrent: { color: C.black },
  levelProgress: { marginBottom: 14 },
  levelNextText: { fontSize: 12, color: C.muted, textAlign: 'right', marginBottom: 8 },

  progressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  progressLabel: { fontSize: 11, color: C.textSecondary, width: 120, textAlign: 'right' },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: C.cardAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.black,
    borderRadius: 4,
  },
  progressPct: { fontSize: 11, color: C.muted, width: 32, textAlign: 'left' },

  levelStatsRow: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    borderTopColor: C.borderLt,
    paddingTop: 12,
  },
  levelStat: { flex: 1, alignItems: 'center' },
  levelStatDivider: { width: 1, backgroundColor: C.borderLt },
  levelStatValue: { fontSize: 18, fontWeight: '800', color: C.text },
  levelStatLabel: { fontSize: 11, color: C.muted, marginTop: 2 },

  // Sections
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'right', marginBottom: 10 },

  nextCard: {
    flexDirection: 'row-reverse',
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.black,
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextCardRight: { flex: 1, padding: 16, alignItems: 'flex-end' },
  nextCardLeft: {
    width: 70,
    backgroundColor: C.black,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  nextTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6 },
  nextMeta: { fontSize: 13, color: C.muted, marginTop: 2 },
  nextInstructor: { fontSize: 12, color: C.mutedLt, marginTop: 4 },
  nextDay: { fontSize: 28, fontWeight: '800', color: C.white },
  nextMonth: { fontSize: 12, color: C.white, opacity: 0.8 },

  emptyCard: {
    backgroundColor: C.cardAlt,
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: C.muted },
  emptyLink: { fontSize: 14, color: C.text, fontWeight: '700', marginTop: 8, textDecorationLine: 'underline' },

  statsRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: C.cardAlt,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 4 },

  bookBtn: {
    backgroundColor: C.black,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  bookBtnText: { fontSize: 16, fontWeight: '700', color: C.white },

  enrollCard: {
    backgroundColor: C.cardAlt,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
    alignItems: 'flex-end',
  },
  enrollTitle: { fontSize: 14, fontWeight: '600', color: C.text },
  enrollMeta: { fontSize: 12, color: C.muted, marginTop: 3 },
});
