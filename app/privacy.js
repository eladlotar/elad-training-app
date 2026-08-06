import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/context/ThemeContext';

// מדיניות פרטיות — נדרשת להגשה לחנויות האפליקציות, ומקושרת ממסך ההגדרות.
// הנוסח מתאר את מה שהאפליקציה עושה בפועל: הנתונים שנאספים נגזרים מהשדות
// שנשלחים ל-mobileAppApi, ולכן כל שינוי בשדות מחייב עדכון גם כאן.
// חשוב: אותו נוסח צריך להתפרסם גם ככתובת אינטרנט פומבית — אפל דורשת קישור.
const SECTIONS = [
  {
    title: '1. מי אנחנו',
    items: [
      'האפליקציה מופעלת על ידי ELAD — בית ספר ללוחמה בטרור, המפעיל מטווח ומעביר אימוני ירי.',
      'האפליקציה מיועדת למתאמנים רשומים בלבד, לניהול ההרשמות, המנוי והפרטים האישיים שלהם.',
      'לשאלות בנושא פרטיות ניתן לפנות אלינו בטלפון או בדוא"ל המופיעים באתר בית הספר.',
    ],
  },
  {
    title: '2. אילו נתונים אנחנו אוספים',
    items: [
      'פרטי קשר: שם מלא, מספר טלפון וכתובת דוא"ל. מספר הטלפון משמש גם כאמצעי ההזדהות לכניסה לאפליקציה.',
      'מספר תעודת זהות. נדרש כדי לזהות אתכם מול רשות הרישוי ולתעד את השתתפותכם באימוני ירי חיים, כמתחייב מהדין.',
      'פרטי רישיון כלי ירייה: מספר הרישיון, סוגו ותאריך תוקפו. ההשתתפות באימונים מותנית ברישיון בתוקף.',
      'פרטי כלי הירייה: סוג, יצרן, דגם, מספר טבוע ובעלות (פרטי או של המטווח).',
      'נתוני אימונים: הרשמות, ביטולים, נוכחות, אי-הגעה וכמות תחמושת ששימשה באימון.',
      'נתוני מנוי ותשלומים: המסלול שנרכש, מכסת הכניסות החודשית וסטטוס התשלום.',
    ],
  },
  {
    title: '3. תמונות ומסמכים',
    items: [
      'התיקייה האישית באפליקציה מאפשרת לצלם או לבחור מסמכים ותמונות, למשל אסמכתת ריענון או קבלה.',
      'הקבצים האלה נשמרים במכשיר שלכם בלבד ואינם נשלחים לשרתי בית הספר.',
      'הרשאת המצלמה והגלריה משמשות אך ורק למטרה זו.',
      'מחיקת האפליקציה תמחק גם את הקבצים שנשמרו בתיקייה האישית.',
    ],
  },
  {
    title: '4. תשלומים',
    items: [
      'התשלומים מתבצעים באמצעות חברת הסליקה גרואו, בדף תשלום מאובטח שלה.',
      'האפליקציה אינה רואה, אינה מקבלת ואינה שומרת פרטי כרטיס אשראי בשום שלב.',
      'בית הספר מקבל מחברת הסליקה אישור על ביצוע התשלום, סכומו ופרטי המשלם, לצורך הפעלת המנוי והפקת חשבונית.',
    ],
  },
  {
    title: '5. למה אנחנו משתמשים בנתונים',
    items: [
      'לניהול ההרשמה שלכם לאימונים ולבדיקת הזכאות להשתתף בהם.',
      'לעמידה בדרישות הדין החלות על הפעלת מטווח ואימוני ירי, ובכלל זה תיעוד רישיון בתוקף.',
      'לניהול המנוי, החיובים והפקת חשבוניות.',
      'לשליחת הודעות תפעוליות בקשר לאימונים שלכם, כגון תזכורת לאימון או הודעה על ביטול.',
      'איננו מוכרים את הנתונים שלכם, ואיננו מעבירים אותם לצדדים שלישיים למטרות פרסום.',
    ],
  },
  {
    title: '6. עם מי הנתונים משותפים',
    items: [
      'חברת הסליקה גרואו — לצורך ביצוע התשלום והפקת החשבונית.',
      'ספק שירותי ההודעות שבאמצעותו נשלחות הודעות תפעוליות.',
      'ספק התשתית שעליו פועלת המערכת ומאוחסן בו מסד הנתונים.',
      'רשויות מוסמכות, ככל שהדין מחייב זאת.',
    ],
  },
  {
    title: '7. מעקב ופרסום',
    items: [
      'האפליקציה אינה כוללת כלי מעקב, כלי פרסום או כלי ניתוח התנהגות מכל סוג.',
      'איננו עוקבים אחריכם באפליקציות או באתרים אחרים.',
      'איננו אוספים את מיקומכם, את אנשי הקשר שלכם או את המיקרופון.',
    ],
  },
  {
    title: '8. כמה זמן הנתונים נשמרים',
    items: [
      'פרטי החשבון נשמרים כל עוד החשבון פעיל.',
      'רשומות תשלומים וחשבוניות נשמרות לתקופה שהדין מחייב, גם לאחר מחיקת החשבון.',
      'קוד הכניסה החד-פעמי תקף לזמן קצר בלבד ומאבד את תוקפו לאחר השימוש.',
    ],
  },
  {
    title: '9. מחיקת החשבון והזכויות שלכם',
    items: [
      'ניתן למחוק את החשבון בכל עת מתוך האפליקציה: הגדרות ← יציאה ומחיקה ← מחיקת החשבון שלי.',
      'המחיקה מסירה את הפרטים המזהים: תעודת זהות, פרטי הרישיון, פרטי הכלי ופרטי הקשר, ומבטלת את האפשרות להתחבר לחשבון.',
      'רשומות תשלומים וחשבוניות יישמרו כפי שהחוק מחייב, ללא הפרטים המזהים.',
      'זכותכם לעיין בנתונים שנאספו עליכם ולבקש את תיקונם. לפנייה בנושא ניתן ליצור איתנו קשר.',
    ],
  },
  {
    title: '10. אבטחת מידע',
    items: [
      'התקשורת בין האפליקציה לשרת מוצפנת.',
      'הכניסה מתבצעת באמצעות קוד חד-פעמי הנשלח לטלפון, ללא סיסמה קבועה.',
      'הגישה לנתונים במערכת הניהול מוגבלת לצוות בית הספר בלבד.',
    ],
  },
  {
    title: '11. קטינים',
    items: [
      'האפליקציה מיועדת לבעלי רישיון כלי ירייה בתוקף בלבד, ולפיכך לבגירים.',
      'איננו אוספים ביודעין נתונים על קטינים.',
    ],
  },
  {
    title: '12. שינויים במדיניות',
    items: [
      'נעדכן מדיניות זו מעת לעת. המועד המעודכן מופיע בתחתית העמוד.',
      'שינוי מהותי יובא לידיעתכם באפליקציה או בהודעה.',
    ],
  },
];

export default function PrivacyScreen() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(C);
  const router = useRouter();

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>מדיניות פרטיות</Text>
          <Text style={s.headerSub}>ELAD — בית ספר ללוחמה בטרור</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={26} color={C.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.intro}>
          מדיניות זו מסבירה אילו נתונים אישיים נאספים באפליקציה, למה הם נדרשים,
          עם מי הם משותפים וכיצד ניתן למחוק אותם.
        </Text>
        {SECTIONS.map((sec) => (
          <View key={sec.title} style={s.section}>
            <Text style={s.sectionTitle}>{sec.title}</Text>
            {sec.items.map((item, i) => (
              <View key={i} style={s.itemRow}>
                <View style={s.bullet} />
                <Text style={s.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        ))}
        <Text style={s.footer}>עודכן: אוגוסט 2026</Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerText: { flex: 1, alignItems: 'flex-end' },
  headerTitle: { fontSize: 19, fontWeight: '800', color: C.text },
  headerSub: { fontSize: 12.5, fontWeight: '600', color: C.textSecondary, marginTop: 2 },
  closeBtn: { marginLeft: 4 },

  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },

  intro: { fontSize: 13.5, color: C.textSecondary, textAlign: 'right', lineHeight: 21, marginBottom: 20 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 15.5, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 10 },
  itemRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.textSecondary, marginTop: 8 },
  itemText: { flex: 1, fontSize: 13.5, color: C.text, textAlign: 'right', lineHeight: 21 },

  footer: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 8 },
});
