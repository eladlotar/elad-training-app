import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { getUser, refreshMe, logout } from '../src/services/auth';
import { C } from '../src/constants/theme';

export default function Entry() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const cached = await getUser();
        if (!cached) { setUser(null); return; }
        try {
          // Validate the session against the server
          const fresh = await refreshMe();
          if (fresh) {
            setUser(fresh);
          } else {
            // Session invalid / expired — force re-login
            await logout();
            setUser(null);
          }
        } catch {
          // Network error — keep the cached user (offline tolerance)
          setUser(cached);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.black} />
      </View>
    );
  }

  if (user) return <Redirect href="/(tabs)/home" />;
  return <Redirect href="/login" />;
}
