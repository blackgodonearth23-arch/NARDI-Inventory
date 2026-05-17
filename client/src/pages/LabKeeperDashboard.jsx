import { useEffect, useState } from 'react';
import {
  Title, Paper, Text, Group, ThemeIcon, SimpleGrid, Table, Badge
} from '@mantine/core';
import {
  IconFlask, IconTool, IconTransfer, IconAlertTriangle, IconPackages
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function LabKeeperDashboard() {
  const { user } = useAuth();
  const labType = user?.lab_type || 'Other';

  const [lowStock, setLowStock] = useState([]);
  const [brokenItems, setBrokenItems] = useState([]);
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [utilityCount, setUtilityCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [calibrationDueCount, setCalibrationDueCount] = useState(0);

  useEffect(() => {
    if (!user?.lab_id) return;

    const fetchers = [];

    if (labType === 'Chemistry') {
      fetchers.push(
        api.get('/reports/restock-list', { params: { lab_id: user.lab_id } })
          .then(res => setLowStock(res.data || []))
          .catch(err => console.error(err))
      );
    } else {
      setLowStock([]);
    }

    fetchers.push(
      api.get('/utilities', { params: { status: 'broken', lab_id: user.lab_id } })
        .then(res => setBrokenItems(res.data || []))
        .catch(err => console.error(err))
    );

    fetchers.push(
      api.get('/transfers', { params: { lab_id: user.lab_id, limit: 10 } })
        .then(res => setRecentTransfers(res.data || []))
        .catch(err => console.error(err))
    );

    if (labType !== 'ICT') {
      fetchers.push(
        api.get('/utilities', { params: { lab_id: user.lab_id } })
          .then(res => setUtilityCount(res.data.length))
          .catch(err => console.error(err)),
        api.get('/utilities/expiring', { params: { days: 30 } })
          .then(res => setExpiringCount(res.data.length))
          .catch(err => console.error(err)),
        api.get('/utilities/calibration-due', { params: { days: 30 } })
          .then(res => setCalibrationDueCount(res.data.length))
          .catch(err => console.error(err))
      );
    }

    Promise.all(fetchers);
  }, [user?.lab_id, labType]);

  return (
    <>
      <Title order={2} mb="lg">
        Lab Dashboard – {user?.display_name}
        {labType && <Badge ml="sm">{labType}</Badge>}
      </Title>

      <SimpleGrid cols={{ base: 1, sm: 2 }} mb="lg">
        {labType === 'Chemistry' && (
          <Paper withBorder p="md" radius="md">
            <Group>
              <ThemeIcon size="xl" variant="light" color="red">
                <IconFlask size={24} />
              </ThemeIcon>
              <div>
                <Text c="dimmed" size="xs">Low Stock Chemicals</Text>
                <Text fw={700} size="xl">{lowStock.length}</Text>
              </div>
            </Group>
          </Paper>
        )}

        {labType !== 'ICT' && (
          <>
            <Paper withBorder p="md" radius="md">
              <Group>
                <ThemeIcon size="xl" variant="light" color="orange">
                  <IconAlertTriangle size={24} />
                </ThemeIcon>
                <div>
                  <Text c="dimmed" size="xs">Broken Equipment</Text>
                  <Text fw={700} size="xl">{brokenItems.length}</Text>
                </div>
              </Group>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Group>
                <ThemeIcon size="xl" variant="light" color="blue">
                  <IconPackages size={24} />
                </ThemeIcon>
                <div>
                  <Text c="dimmed" size="xs">Utility Items</Text>
                  <Text fw={700} size="xl">{utilityCount}</Text>
                </div>
              </Group>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Group>
                <ThemeIcon size="xl" variant="light" color="yellow">
                  <IconAlertTriangle size={24} />
                </ThemeIcon>
                <div>
                  <Text c="dimmed" size="xs">Expiring Soon</Text>
                  <Text fw={700} size="xl">{expiringCount}</Text>
                </div>
              </Group>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Group>
                <ThemeIcon size="xl" variant="light" color="violet">
                  <IconTool size={24} />
                </ThemeIcon>
                <div>
                  <Text c="dimmed" size="xs">Calibration Due</Text>
                  <Text fw={700} size="xl">{calibrationDueCount}</Text>
                </div>
              </Group>
            </Paper>
          </>
        )}

        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="xl" variant="light" color="grape">
              <IconTransfer size={24} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs">Recent Transfers</Text>
              <Text fw={700} size="xl">{recentTransfers.length}</Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      {labType === 'Chemistry' && lowStock.length > 0 && (
        <>
          <Text fw={600} mb="sm">Low Stock Items</Text>
          <Table mb="lg">
            <thead><tr><th>Chemical</th><th>Location</th><th>Unopened</th><th>Threshold</th></tr></thead>
            <tbody>
              {lowStock.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.chemical}</td>
                  <td>{item.location}</td>
                  <td>{item.unopened}</td>
                  <td>{item.reorder_threshold}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}

      {labType !== 'ICT' && brokenItems.length > 0 && (
        <>
          <Text fw={600} mb="sm">Broken Equipment</Text>
          <Table mb="lg">
            <thead><tr><th>Name</th><th>Type</th><th>Location</th><th>Serial</th></tr></thead>
            <tbody>
              {brokenItems.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td><Badge>{item.type}</Badge></td>
                  <td>{item.location_name || item.location_id}</td>
                  <td>{item.org_serial || '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}

      {recentTransfers.length > 0 && (
        <>
          <Text fw={600} mb="sm">Recent Transfers</Text>
          <Table>
            <thead><tr><th>User</th><th>Type</th><th>From</th><th>To</th><th>Date</th></tr></thead>
            <tbody>
              {recentTransfers.slice(0, 5).map(t => (
                <tr key={t.id}>
                  <td>{t.user_name || t.user_id}</td>
                  <td>{t.item_type}</td>
                  <td>{t.from_location_id}</td>
                  <td>{t.to_location_id}</td>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </>
  );
}