import React, { useEffect, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { HTML } from './mapHtml';

export type { MapCircle, MapMarker } from './mapTypes';
import type { MapCircle, MapMarker } from './mapTypes';

export function LeafletMap({
  markers = [],
  circles = [],
  center,
  onPress,
  style,
}: {
  markers?: MapMarker[];
  circles?: MapCircle[];
  center?: { lat: number; lng: number } | null;
  onPress?: (lat: number, lng: number) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const ref = useRef<{ injectJavaScript: (js: string) => void } | null>(null);
  const payload = JSON.stringify({ markers, circles, center: center ?? null });
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) ref.current?.injectJavaScript(`window.update(${payload});true;`);
  }, [payload]);

  return (
    <WebView
      ref={ref as never}
      originWhitelist={['*']}
      source={{ html: HTML }}
      style={[{ flex: 1, borderRadius: 12 }, style]}
      onLoadEnd={() => {
        loaded.current = true;
        ref.current?.injectJavaScript(`window.update(${payload});true;`);
      }}
      onMessage={(e: WebViewMessageEvent): void => {
        if (!onPress) return;
        const { lat, lng } = JSON.parse(e.nativeEvent.data);
        onPress(lat, lng);
      }}
    />
  );
}
