import { useEffect, useState } from 'react';
import {
  Title, Paper, Text, Group, ThemeIcon, SimpleGrid, Select, Table, Badge
} from '@mantine/core';
import { IconDeviceDesktop, IconTool, IconTransfer } from '@tabler/icons-react';
import api from '../api/axios';

export default function ICTDashboard() {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [hardware, setHardware] = useState([]);
  const [stats, setStats] = useState({ total: 0, in_use: 0, available: 0, under_repair: 0 });

  useEffect(() => {
    fetchStations();
  }, []);

  useEffect(() => {
    fetchHardware();
  }, [selectedStation]);

  const fetchStations = async () => {
    try {
      const res = await api.get('/locations', { params: { type: 'station' } });
      setStations(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchHardware = async () => {
    try {
      const params = {};
      if (selectedStation) params.location_id = selectedStation;
      const res = await api.get('/ict/hardware', { params });
      const items = res.data;
      setHardware(items);
      setStats({
        total: items.length,
        in_use: items.filter(h => h.status === 'in_use').length,
        available: items.filter(h => h.status === 'available').length,
        under_repair: items.filter(h => h.status === 'under_repair').length,
      });
    } catch (err) { console.error(err); }
  };

  return (
    <>
      <Title order={2} mb="lg">ICT Dashboard</Title>
      <Group mb="lg">
        <Select
          placeholder="Filter by station"
          data={stations.map(s => ({ value: s.id.toString(), label: s.name }))}
          value={selectedStation?.toString()}
          onChange={(val) => setSelectedStation(parseInt(val))}
          clearable
        />
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="lg">
        <StatCard icon={<IconDeviceDesktop />} label="Total Devices" value={stats.total} />
        <StatCard icon={<IconDeviceDesktop />} label="In Use" value={stats.in_use} color="blue" />
        <StatCard icon={<IconDeviceDesktop />} label="Available" value={stats.available} color="green" />
        <StatCard icon={<IconTool />} label="Under Repair" value={stats.under_repair} color="red" />
      </SimpleGrid>
      <Paper withBorder p="md">
        <Text fw={600} mb="sm">Recent Devices</Text>
        <Table>
          <thead><tr><th>Asset ID</th><th>Computer Name</th><th>Type</th><th>Station</th><th>Assigned To</th><th>Status</th></tr></thead>
          <tbody>
            {hardware.slice(0,10).map(h => (
              <tr key={h.id}>
                <td>{h.asset_id}</td>
                <td>{h.computer_name || '—'}</td>
                <td><Badge>{h.type}</Badge></td>
                <td>{h.station_name || '—'}</td>
                <td>{h.assigned_to_employee || '—'}</td>
                <td><Badge color={h.status === 'in_use' ? 'blue' : 'green'}>{h.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>
    </>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group>
        <ThemeIcon size="xl" variant="light" color={color}>
          {icon}
        </ThemeIcon>
        <div>
          <Text c="dimmed" size="xs">{label}</Text>
          <Text fw={700} size="xl">{value}</Text>
        </div>
      </Group>
    </Paper>
  );
}