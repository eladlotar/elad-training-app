import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildTheme } from '../constants/theme';

const PALETTE_KEY = 'elad_palette';
const ICONSET_KEY = 'elad_icon_set';

// Three icon sets — each conveys the SAME meaning per tab with a different design.
export const ICON_SETS = {
  setA: { name: 'קלאסי', calendar: 'calendar',        myregs: 'checkmark-circle',      home: 'home', person: 'person',        settings: 'settings', license: 'shield-checkmark' },
  setB: { name: 'מודרני', calendar: 'calendar-number', myregs: 'clipboard',             home: 'home', person: 'person-circle', settings: 'cog',      license: 'ribbon' },
  setC: { name: 'חד',     calendar: 'calendar-clear',  myregs: 'checkmark-done-circle', home: 'home', person: 'body',          settings: 'options',  license: 'medal' },
};

/** Resolve a tab semantic key + icon set → Ionicons name (filled when focused). */
export function tabIcon(key, iconSet, focused) {
  const set = ICON_SETS[iconSet] || ICON_SETS.setA;
  const base = set[key] || ICON_SETS.setA[key] || key;
  return focused ? base : `${base}-outline`;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [paletteId, setPaletteId] = useState('tactical'); // tactical = default
  const [iconSet, setIconSetState] = useState('setA');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await AsyncStorage.getItem(PALETTE_KEY);
        if (p) setPaletteId(p);
        const i = await AsyncStorage.getItem(ICONSET_KEY);
        if (i && ICON_SETS[i]) setIconSetState(i);
      } catch {}
      setReady(true);
    })();
  }, []);

  const setPalette = async (id) => {
    setPaletteId(id);
    try { await AsyncStorage.setItem(PALETTE_KEY, id); } catch {}
  };

  const setIconSet = async (id) => {
    setIconSetState(id);
    try { await AsyncStorage.setItem(ICONSET_KEY, id); } catch {}
  };

  const C = useMemo(() => buildTheme(paletteId), [paletteId]);

  const value = { C, paletteId, setPalette, iconSet, setIconSet, ready };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { C: buildTheme('tactical'), paletteId: 'tactical', setPalette: () => {}, iconSet: 'setA', setIconSet: () => {}, ready: true };
  return ctx;
}
