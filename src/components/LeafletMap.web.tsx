import React, { useEffect, useRef } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { HTML } from './mapHtml';
import type { MapCircle, MapMarker } from './mapTypes';

export type { MapCircle, MapMarker };

// Brauzer versiyasi: WebView o'rniga iframe
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
  const ref = useRef<HTMLIFrameElement>(null);
  const loaded = useRef(false);
  const payload = JSON.stringify({ markers, circles, center: center ?? null });
  const html = HTML.replace(
    'window.ReactNativeWebView.postMessage(',
    'window.parent.postMessage(',
  );

  const push = () => (ref.current?.contentWindow as any)?.update?.(JSON.parse(payload));

  useEffect(() => {
    if (loaded.current) push();
  }, [payload]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow || !onPress) return;
      const { lat, lng } = JSON.parse(e.data);
      onPress(lat, lng);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onPress]);

  return (
    <View style={[{ flex: 1, borderRadius: 12, overflow: 'hidden' }, style]}>
      <iframe
        ref={ref}
        srcDoc={html}
        style={{ border: 0, width: '100%', height: '100%' }}
        onLoad={() => {
          loaded.current = true;
          push();
        }}
      />
    </View>
  );
}
