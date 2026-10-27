import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '../../components/ui';
import { useSettings } from '../../lib/data';
import MapTab from './MapTab';
import ReportTab from './ReportTab';
import SettingsTab from './SettingsTab';
import StaffTab from './StaffTab';
import TasksTab from './TasksTab';

const TABS = [
  { id: 'map', label: 'Xarita', icon: '🗺' },
  { id: 'tasks', label: 'Topshiriq', icon: '📍' },
  { id: 'report', label: 'KPI/Maosh', icon: '📊' },
  { id: 'staff', label: 'Xodimlar', icon: '👥' },
  { id: 'settings', label: 'Sozlama', icon: '⚙️' },
] as const;

export default function AdminHome() {
  const settings = useSettings();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('map');

  return (
    <View style={{ flex: 1, paddingTop: 44 }}>
      <View style={{ flex: 1 }}>
        {tab === 'map' && <MapTab settings={settings} />}
        {tab === 'tasks' && <TasksTab settings={settings} />}
        {tab === 'report' && <ReportTab settings={settings} />}
        {tab === 'staff' && <StaffTab settings={settings} />}
        {tab === 'settings' && <SettingsTab settings={settings} />}
      </View>
      <View
        style={{
          flexDirection: 'row',
          borderTopWidth: 1,
          borderColor: colors.border,
          backgroundColor: '#fff',
          paddingBottom: 20,
        }}
      >
        {TABS.map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ fontSize: 20 }}>{t.icon}</Text>
            <Text style={{ fontSize: 11, color: tab === t.id ? colors.primary : colors.muted, fontWeight: tab === t.id ? '700' : '400' }}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
