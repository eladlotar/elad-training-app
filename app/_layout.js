import { useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '../src/context/ThemeContext';
import UpdatePrompt from '../src/components/UpdatePrompt';

const RTL_LOCK_KEY = 'elad_rtl_lock_v1';

// כל מסכי האפליקציה בנויים בעברית עם היפוך ידני של השורות (row-reverse).
// באנדרואיד עם שפת מערכת עברית, אנדרואיד מפעיל מצב ימין-לשמאל מעצמו והופך
// את השורות בחזרה — ואז כותרות הימים ביומן יוצאות הפוכות מהתאריכים שמתחתן.
// נועלים את כיוון הבסיס לשמאל-לימין כדי שההיפוך הידני יישאר ההיפוך היחיד.
// אנדרואיד בלבד: באייפון המסכים אומתו כמו שהם, ולא נוגעים בהתנהגות שלהם.
if (Platform.OS === 'android') {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}

export default function RootLayout() {
  // הנעילה נקלטת רק בהפעלה הבאה של האפליקציה. אם המכשיר עדיין רץ במצב
  // ימין-לשמאל, מבצעים טעינה מחדש אחת בלבד — הדגל מונע לולאת הפעלות.
  useEffect(() => {
    if (Platform.OS !== 'android' || !I18nManager.isRTL) return;
    (async () => {
      try {
        if (await AsyncStorage.getItem(RTL_LOCK_KEY)) return;
        await AsyncStorage.setItem(RTL_LOCK_KEY, '1');
        await Updates.reloadAsync();
      } catch {}
    })();
  }, []);

  return (
    <ThemeProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFFFFF' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="payment" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="terms" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="privacy" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
      {/* חלון "יש גרסה חדשה" — בודק מול האפ סטור בכל הפעלה. */}
      <UpdatePrompt />
    </ThemeProvider>
  );
}
