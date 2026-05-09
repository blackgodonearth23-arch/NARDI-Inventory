import { useEffect, useState } from 'react';
import {
  Title, Paper, Text, Group, ThemeIcon, SimpleGrid, Button, TextInput, Modal, Alert, Badge
} from '@mantine/core';
import { IconFlask, IconSearch } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { useDisclosure } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';

export default function LabUserDashboard() {
  const { user } = useAuth();
  const [containers, setContainers] = useState([]);
  const [openPin, setOpenPin] = useState('');
  const [openedModal, { open, close }] = useDisclosure(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.lab_id) loadContainers();
  }, [user?.lab_id]);

  const loadContainers = async () => {
    try {
      // Get all locations of user's lab
      const locsRes = await api.get('/locations', { params: { lab_id: user.lab_id } });
      const locIds = locsRes.data.map(l => l.id);
      if (locIds.length === 0) return setContainers([]);

      // Fetch containers for each location
      const allContainers = [];
      for (const locId of locIds) {
        const res = await api.get('/containers', { params: { location_id: locId } });
        allContainers.push(...res.data);
      }
      setContainers(allContainers);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenContainer = async () => {
    setError('');
    try {
      // Open container by PIN (the endpoint /chemicals/:id/open uses any chemical, but we need a generic open.
      // The current open endpoint is tied to a specific chemical. We'll use a dedicated open-container endpoint?
      // For now, we'll use the one from chemicals.js (POST /chemicals/:id/open) but that requires chemical id.
      // Instead, we should use a new generic endpoint. To avoid breaking, we'll use the containers' own open.
      // The model Container.open(pin, userId) works without chemical id. We'll call a new route.
      // We'll fix this by adding a simple open-container route. (will do after)
      await api.post('/containers/open', { pin_5: openPin }); // we'll create this route
      showNotification({ color: 'green', title: 'Container opened' });
      close();
      loadContainers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to open container');
    }
  };

  return (
    <>
      <Title order={2} mb="lg">My Lab – {user.display_name}</Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }} mb="lg">
        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="xl" variant="light">
              <IconFlask size={24} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs">Total Containers in My Lab</Text>
              <Text fw={700} size="xl">{containers.length}</Text>
            </div>
          </Group>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Button fullWidth leftSection={<IconSearch size={18} />} onClick={open}>
            Open Container by PIN
          </Button>
        </Paper>
      </SimpleGrid>

      <Text fw={600} mb="sm">Containers</Text>
      {containers.length === 0 ? (
        <Text c="dimmed">No containers in your lab yet.</Text>
      ) : (
        <Paper withBorder p="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            {containers.map(c => (
              <Paper key={c.id} withBorder p="xs">
                <Group>
                  <Text fw={500}>{c.chemical_name || 'Unknown'}</Text>
                  <Badge color={c.status === 'unopened' ? 'green' : 'blue'}>
                    {c.status}
                  </Badge>
                </Group>
                <Text size="sm">PIN: {c.pin_5}</Text>
                <Text size="xs">Type: {c.container_type}</Text>
              </Paper>
            ))}
          </SimpleGrid>
        </Paper>
      )}

      <Modal opened={openedModal} onClose={close} title="Open Container">
        <TextInput
          label="Container 5‑digit PIN"
          value={openPin}
          onChange={(e) => setOpenPin(e.currentTarget.value)}
          maxLength={5}
          pattern="[0-9]{5}"
          required
        />
        {error && <Alert color="red" mt="sm">{error}</Alert>}
        <Button mt="md" onClick={handleOpenContainer}>Open</Button>
      </Modal>
    </>
  );
}