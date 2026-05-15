import { useEffect, useState } from 'react';
import {
  Title, Paper, Text, Group, ThemeIcon, SimpleGrid, Alert, Table, Badge
} from '@mantine/core';
import {
  IconUsers, IconBuildingWarehouse, IconFlask,
  IconDeviceDesktop, IconLicense, IconAlertTriangle
} from '@tabler/icons-react';
import api from '../api/axios';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    labs: 0,
    chemicals: 0,
    hardware: 0,
    licenses: 0,
    lowStockCount: 0,
    brokenItems: 0,
  });
  const [expiringLicenses, setExpiringLicenses] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          usersRes,
          labsRes,
          chemicalsRes,
          hardwareRes,
          licensesRes,
          lowStockRes,
          brokenRes,
        ] = await Promise.all([
          api.get('/users'),
          api.get('/labs'),
          api.get('/chemicals'),
          api.get('/ict/hardware'),
          api.get('/ict/licenses'),
          api.get('/reports/restock-list'),
          api.get('/utilities', { params: { status: 'broken' } }),   // CHANGED
        ]);

        const lowStockItems = lowStockRes.data || [];
        const brokenItems = brokenRes.data || [];

        setStats({
          users: usersRes.data.length,
          labs: labsRes.data.length,
          chemicals: chemicalsRes.data.length,
          hardware: hardwareRes.data.length,
          licenses: licensesRes.data.length,
          lowStockCount: lowStockItems.length,
          brokenItems: brokenItems.length,   // now counts ALL broken utilities
        });

        const soon = licensesRes.data.filter(lic => {
          if (!lic.expiration_date) return false;
          const expiry = new Date(lic.expiration_date);
          const diffDays = (expiry - new Date()) / (1000 * 60 * 60 * 24);
          return diffDays <= 30 && diffDays > 0;
        });
        setExpiringLicenses(soon);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      <Title order={2} mb="lg">Admin Dashboard</Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="lg">
        <StatCard icon={<IconUsers size={24} />} label="Total Users" value={stats.users} />
        <StatCard icon={<IconBuildingWarehouse size={24} />} label="Labs" value={stats.labs} />
        <StatCard icon={<IconFlask size={24} />} label="Chemicals" value={stats.chemicals} />
        <StatCard icon={<IconDeviceDesktop size={24} />} label="Hardware Assets" value={stats.hardware} />
        <StatCard icon={<IconLicense size={24} />} label="Software Licenses" value={stats.licenses} />
        <StatCard icon={<IconAlertTriangle size={24} />} color="red" label="Low Stock Items" value={stats.lowStockCount} />
        <StatCard icon={<IconAlertTriangle size={24} />} color="orange" label="Broken Items" value={stats.brokenItems} />
      </SimpleGrid>

      {expiringLicenses.length > 0 && (
        <Alert icon={<IconAlertTriangle size={16} />} color="yellow" mb="md">
          {expiringLicenses.length} licence(s) expire within 30 days
        </Alert>
      )}

      <Paper withBorder p="md">
        <Text fw={600} mb="sm">Licences Expiring Soon</Text>
        {expiringLicenses.length === 0 ? (
          <Text c="dimmed">No upcoming expirations.</Text>
        ) : (
          <Table>
            <thead>
              <tr><th>Name</th><th>Type</th><th>Expiry</th></tr>
            </thead>
            <tbody>
              {expiringLicenses.map(lic => (
                <tr key={lic.id}>
                  <td>{lic.name}</td>
                  <td><Badge>{lic.license_type}</Badge></td>
                  <td>{lic.expiration_date?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
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