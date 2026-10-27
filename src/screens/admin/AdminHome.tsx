import React, { useState } from 'react';
import { t as tr } from '../../lib/i18n';
import { Pressable, Text, View } from 'react-native';
import { colors } from '../../components/ui';
import { useSettings } from '../../lib/data';
import MapTab from './MapTab';
import ReportTab from './ReportTab';
import SettingsTab from './SettingsTab';
import StaffTab from './StaffTab';
import TasksTab from './TasksTab';

const TABS = [
  { id: 'map', label: 'tabMap', icon: '🗺' },
  { id: 'tasks', label: 'tabTasks', icon: '📍' },
  { id: 'report', label: 'tabReport', icon: '📊' },
  { id: 'staff', label: 'tabStaff', icon: '👥' },
  { id: 'settings', label: 'tabSettings', icon: '⚙️' },
] as const;

// Til almashganda ekran qayta yaratiladi — tanlangan bo'lim saqlanib qoladi
let lastTab: (typeof TABS)[number]['id'] = 'map';

export default function AdminHome() {
  const settings = useSettings();
  const [tab, setTabState] = useState(lastTab);
  const setTab = (id: typeof tab) => {
    lastTab = id;
    setTabState(id);
  };

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
              {tr(t.label)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
