import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LeafletMap, MapMarker } from '../../components/LeafletMap';
import { Card, colors, Muted } from '../../components/ui';
import { distanceM } from '../../lib/geo';
import { dayKey, fmtTime, getShift, isShiftNow, monthKey, scheduleFor } from '../../lib/time';
import { Settings } from '../../lib/types';
import { useEmployees, useLive, useMonthSessions, useTasks } from './useAdminData';

const STALE_MS = 10 * 60000;

export default function MapTab({ settings }: { settings: Settings }) {
  const employees = useEmployees();
  const live = useLive();
  const tasks = useTasks();
  const [now, setNow] = useState(Date.now());
  const sessions = useMonthSessions(monthKey(now));
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const rows = useMemo(
    () =>
      employees
        .filter((e) => e.active !== false)
        .map((e) => {
          const l = live.find((x) => x.uid === e.uid);
          const working = !!l?.sessionId;
          const shift = getShift(settings, e.shift);
          const onShift = isShiftNow(shift, now);
          // Hozirgi smena qaysi kuni boshlangan
          const sched = scheduleFor(shift, now);
          const shiftDay = dayKey(sched.start <= now ? sched.start : sched.start - 86400000);
          const startedThisShift = sessions.some((s) => s.uid === e.uid && s.day === shiftDay);
          const task = tasks.find((t) => t.uid === e.uid && (t.status === 'pending' || t.status === 'arrived'));
          let status: string;
          let color: string;
          if (working && l) {
            if (now - l.ts > STALE_MS) {
              status = `Signal yo'q (${fmtTime(l.ts)} dan beri)`;
              color = colors.gray;
            } else if (l.inside) {
              status = 'Ofisda';
              color = colors.green;
            } else if (task) {
              status = `Topshiriqda: ${task.title}`;
              color = colors.primary;
            } else {
              const d = Math.round(distanceM(l.lat, l.lng, settings.office.lat, settings.office.lng));
              status = `Ofisdan tashqarida (${d} m)`;
              color = colors.orange;
            }
            if (l.mocked) status += ' · FAKE GPS!';
          } else if (onShift && !startedThisShift) {
            status = 'Kelmagan';
            color = colors.red;
          } else {
            status = onShift ? 'Ishni tugatgan' : 'Smenada emas';
            color = colors.gray;
          }
          return { e, l, working, status, color };
        }),
    [employees, live, sessions, tasks, settings, now],
  );

  const markers: MapMarker[] = rows
    .filter((r) => r.working && r.l)
    .map((r) => ({ id: r.e.uid, lat: r.l!.lat, lng: r.l!.lng, color: r.color, label: r.e.name }));
  const taskMarkers: MapMarker[] = tasks
    .filter((t) => t.status === 'pending' || t.status === 'arrived')
    .map((t) => ({ id: t.id, lat: t.lat, lng: t.lng, color: '#7C3AED', label: `📍 ${t.title}` }));

  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: '55%', padding: 8 }}>
        <LeafletMap
          markers={[...markers, ...taskMarkers]}
          circles={[{ ...settings.office, color: colors.primary }]}
          center={focus}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        <Card>
          {rows.length === 0 && <Muted>Xodimlar qo'shilmagan. "Xodimlar" bo'limiga o'ting.</Muted>}
          {rows.map((r) => (
            <Pressable
              key={r.e.uid}
              onPress={() => r.l && setFocus({ lat: r.l.lat, lng: r.l.lng })}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 }}
            >
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: r.color }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', fontSize: 15 }}>
                  {r.e.name} <Text style={{ color: colors.muted, fontWeight: '400' }}>· {r.e.position}</Text>
                </Text>
                <Text style={{ color: r.color, fontSize: 13 }}>{r.status}</Text>
              </View>
              {r.l && r.working && <Muted>{fmtTime(r.l.ts)}</Muted>}
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}
