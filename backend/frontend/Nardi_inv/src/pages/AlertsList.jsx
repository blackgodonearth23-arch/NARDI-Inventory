import { useState, useEffect } from 'react';
import { Title, List, Button, Badge, Group, Text, Paper, Alert as MantineAlert } from '@mantine/core';
import { IconAlertTriangle, IconBell } from '@tabler/icons-react';
import api from '../api/axios';

export default function AlertsList() {
  const [alerts, setAlerts] = useState([]);

  const fetchAlerts = async () => {
    const res = await api.get('/alerts');
    setAlerts(res.data);
  };

  useEffect(() => { fetchAlerts(); }, []);

  const markRead = async (id) => {
    await api.patch(`/alerts/${id}/read`);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  };

  const markAllRead = async () => {
    await api.patch('/alerts/read-all');
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
  };

  const typeColor = {
    low_stock: 'orange',
    broken_equipment: 'red',
    license_expiry: 'yellow',
    info: 'blue'
  };

  return (
    <>
      <Group position="apart" mb="md">
        <Title order={2}>Notifications</Title>
        <Button variant="subtle" onClick={markAllRead}>Mark all as read</Button>
      </Group>
      {alerts.length === 0 ? (
        <Text color="dimmed">No notifications</Text>
      ) : (
        <Paper withBorder p="md">
          {alerts.map(alert => (
            <Group key={alert.id} mb="xs" spacing="sm">
              <Badge color={typeColor[alert.type] || 'gray'}>{alert.type.replace('_', ' ')}</Badge>
              <Text style={{ flex: 1 }}>{alert.message}</Text>
              {!alert.is_read && (
                <Button compact variant="outline" size="xs" onClick={() => markRead(alert.id)}>
                  Mark read
                </Button>
              )}
            </Group>
          ))}
        </Paper>
      )}
    </>
  );
}