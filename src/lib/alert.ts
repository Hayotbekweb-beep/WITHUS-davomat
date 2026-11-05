import { Alert, AlertButton, Platform } from 'react-native';

// Alert.alert brauzerda (react-native-web) hech narsa ko'rsatmaydi —
// web'da window.alert / window.confirm ishlatiladi.
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  const text = message ? `${title}\n\n${message}` : title;
  if (!buttons || buttons.length < 2) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }
  const action = [...buttons].reverse().find((b) => b.style !== 'cancel' && b !== buttons[0]) ?? buttons[1];
  if (window.confirm(text)) action.onPress?.();
  else buttons[0].onPress?.();
}
