import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/context/ThemeContext';

// תקנון המנויים — הנוסח אושר ע"י אלעד 13/07/2026. שינויי נוסח נעשים כאן
// (ובעותק המקביל בפורטל) — אין מקור תוכן משותף בין האפליקציה לפורטל.
const SECTIONS = [
  {
    title: '1. המנוי',
    items: [
      'המנוי הוא אישי ואינו ניתן להעברה.',
      'המנוי מקנה השתתפות באימוני קבוצות ירי בלבד, בהתאם למסלול שנרכש: "פעם בחודש" (כניסה אחת) או "פעמיים בחודש" (שתי כניסות).',
      'תקופת המנוי: המנוי נרכש בהתחייבות לתקופה של 6 חודשים לפחות. בתום תקופת ההתחייבות המנוי מתחדש אוטומטית מחודש לחודש, עד לביטולו.',
      'המכסה מתחדשת בכל חודש קלנדרי. כניסות שלא נוצלו אינן נצברות ואינן עוברות לחודש הבא.',
      'ניתן להירשם מראש גם לאימונים בחודש הבא; ההרשמה נספרת על מכסת החודש שבו מתקיים האימון.',
    ],
  },
  {
    title: '2. הצהרת בריאות וכשירות',
    items: [
      'בהצטרפותו למנוי מצהיר המתאמן כי הוא בריא וכשיר להשתתף באימוני ירי ובפעילות גופנית, וכי אין לו מגבלה רפואית, גופנית או אחרת המונעת את השתתפותו.',
      'חלה על המתאמן חובה לעדכן את בית הספר על כל שינוי במצבו הרפואי. השתתפות באימון בניגוד להצהרה זו היא באחריות המתאמן בלבד.',
    ],
  },
  {
    title: '3. רישיון כלי ירייה — באחריות המתאמן בלבד',
    items: [
      'ההשתתפות באימונים מותנית ברישיון נשיאת כלי ירייה בתוקף.',
      'האחריות המלאה והבלעדית לתוקף הרישיון חלה על המתאמן. לבית הספר אין כל קשר, מעורבות או אחריות למצב רישיונו של המתאמן.',
      'פג תוקף הרישיון — אסור למתאמן להתאמן, ואסור לבית הספר לאמנו, וזאת עד לחידוש הרישיון. תקופה שבה לא התאמן המתאמן בשל רישיון שאינו בתוקף אינה מזכה בהחזר, בהקפאה או בהארכת המנוי.',
      'ההשתתפות מותנית גם בהשלמת פרטי יורה במערכת.',
    ],
  },
  {
    title: '4. תשלום',
    items: [
      'התשלום בהוראת קבע חודשית באמצעות דף תשלום מאובטח (גרואו).',
      'אי-תשלום (חיוב שנכשל) חוסם הרשמה לאימונים עד הסדרת החוב מול בית הספר.',
      'בית הספר רשאי לעדכן מחירים בהודעה מראש של 30 יום; העדכון יחול מהחיוב החודשי הבא.',
    ],
  },
  {
    title: '5. הרשמה לאימונים',
    items: [
      'ההשתתפות באימון מחייבת הרשמה מראש דרך האפליקציה או הפורטל.',
      'מספר המשתתפים באימון מוגבל ל-12 בהתאם להוראות הדין; ההרשמה על בסיס מקום פנוי.',
    ],
  },
  {
    title: '6. ביטול הרשמה לאימון',
    items: [
      'ביטול עד 3 ימים לפני מועד האימון — הכניסה חוזרת למכסה החודשית.',
      'ביטול מאוחר מ-3 ימים לפני האימון — הכניסה נשרפת ולא תוחזר. הביטול מותנה באישור מפורש של המתאמן באפליקציה.',
      'אי-הגעה לאימון ללא ביטול — הכניסה נשרפת. ביטולים מאוחרים ואי-הגעות מתועדים בכרטיס המתאמן.',
    ],
  },
  {
    title: '7. ביטול המנוי',
    items: [
      'ביטול המנוי נעשה בפנייה ישירה לבית הספר בטלפון או בוואטסאפ.',
      'ביטול לאחר תום תקופת ההתחייבות נכנס לתוקף בתום החודש ששולם; אין החזר יחסי על חודש שכבר חויב, והכניסות שנותרו עומדות למתאמן עד סוף אותו חודש.',
      'ביטול במהלך תקופת ההתחייבות כפוף להוראות הדין החל על עסקאות מתמשכות.',
      'בית הספר רשאי להפסיק מנוי במקרה של הפרת התקנון או הוראות בטיחות, ללא החזר.',
    ],
  },
  {
    title: '8. כללי',
    items: [
      'ההשתתפות באימונים כפופה להוראות הבטיחות ולהנחיות המדריכים בכל עת.',
      'בית הספר רשאי לעדכן תקנון זה; הנוסח המעודכן יפורסם ויחייב ממועד פרסומו.',
    ],
  },
];

export default function TermsScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);
  const router = useRouter();

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>תקנון מנויי ירי</Text>
          <Text style={s.headerSub}>ELAD — בית ספר ללוחמה בטרור</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={26} color={C.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
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
        <Text style={s.footer}>עודכן: יולי 2026</Text>
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
    paddingTop: 58,
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

  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 15.5, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 10 },
  itemRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.textSecondary, marginTop: 8 },
  itemText: { flex: 1, fontSize: 13.5, color: C.text, textAlign: 'right', lineHeight: 21 },

  footer: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 8 },
});
