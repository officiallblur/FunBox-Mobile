import { LogBox, Platform } from 'react-native';

if (Platform.OS === 'web') {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const first = typeof args[0] === 'string' ? args[0] : '';
    if (first.includes('props.pointerEvents is deprecated')) {
      return;
    }
    originalWarn(...args);
  };
}

if (__DEV__) {
  LogBox.ignoreLogs(['Unable to activate keep awake']);
}
