import { useEffect, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { Title, Paper, Text, Badge, Button, Group, Alert } from '@mantine/core';
import { IconBottle, IconAlertCircle } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function OpenBottle() {
  const [searchParams] = useSearchParams();
  const pin = searchParams.get('pin') || '';
  const { user } = useAuth();
  const [bottle, setBottle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pin) {
      setError('No PIN provided');
      setLoading(false);
      return;
    }
    const fetchBottle = async () => {
      try {
        const res = await api.get('/chemicals/bottles', { params: { pin } });
        if (res.data.length === 0) {
          setError('Bottle not found');
        } else {
          setBottle(res.data[0]);
        }
      } catch (err) {
        setError('Failed to load bottle info');
      } finally {
        setLoading(false);
      }
    };
    fetchBottle();
  }, [pin]);

  const handleOpen = async () => {
    if (!bottle) return;
    setOpening(true);
    try {
      await api.post(`/chemicals/${bottle.chemical_id}/open`, { pin_5: bottle.pin_5 });
      showNotification({ color: 'green', title: 'Bottle opened' });
      setBottle((prev) => ({ ...prev, status: 'opened' }));
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: err.response?.data?.error || 'Open failed' });
    } finally {
      setOpening(false);
    }
  };

  if (!user) return <Navigate to="/login" />;
  if (loading) return <Text>Loading…</Text>;
  if (error) return <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>;

  return (
    <>
      <Title order={2} mb="lg">Open Bottle</Title>
      {bottle ? (
        <Paper withBorder p="md">
          <Group mb="md">
            <IconBottle size={24} />
            <div>
              <Text weight={500}>PIN: <Badge>{bottle.pin_5}</Badge></Text>
              <Text size="sm">Chemical: {bottle.chemical_name}</Text>
              <Text size="sm">Status: <Badge color={bottle.status === 'unopened' ? 'green' : 'blue'}>{bottle.status}</Badge></Text>
              {bottle.expiry_date && <Text size="sm">Expiry: {bottle.expiry_date.slice(0, 10)}</Text>}
            </div>
          </Group>
          {bottle.status === 'unopened' ? (
            <Button leftSection={<IconBottle size={16} />} loading={opening} onClick={handleOpen}>
              Open Bottle
            </Button>
          ) : (
            <Alert color="blue">This bottle is already opened.</Alert>
          )}
        </Paper>
      ) : (
        <Text color="dimmed">No bottle selected.</Text>
      )}
    </>
  );
}