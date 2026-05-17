import { useState, useEffect } from 'react';
import {
  Title, Paper, Table, Button, Group, Badge, TextInput, Menu, ActionIcon, Modal, Text
} from '@mantine/core';
import { IconSearch, IconDots, IconBottle, IconX, IconCalendar } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function BottleInventory() {
  const { user } = useAuth();
  const [bottles, setBottles] = useState([]);
  const [searchPin, setSearchPin] = useState('');
  const [expiryModal, setExpiryModal] = useState(false);
  const [selectedBottle, setSelectedBottle] = useState(null);
  const [newExpiry, setNewExpiry] = useState('');

  useEffect(() => {
    fetchBottles();
  }, []);

  const fetchBottles = async () => {
    const res = await api.get('/chemicals/bottles');
    setBottles(res.data);
  };

  const handleOpen = async (bottle) => {
    try {
      await api.post(`/chemicals/${bottle.chemical_id}/open`, { pin_5: bottle.pin_5 });
      showNotification({ color: 'green', title: 'Bottle opened' });
      fetchBottles();
    } catch (err) {
      showNotification({ color: 'red', title: err.response?.data?.error || 'Error' });
    }
  };

  const handleVoid = async (bottle) => {
    try {
      await api.post(`/chemicals/bottles/${bottle.id}/void`);
      showNotification({ color: 'orange', title: 'Bottle voided' });
      fetchBottles();
    } catch (err) {
      showNotification({ color: 'red', title: err.response?.data?.error || 'Error' });
    }
  };

  const openExpiryEdit = (bottle) => {
    setSelectedBottle(bottle);
    setNewExpiry(bottle.expiry_date ? bottle.expiry_date.slice(0,10) : '');
    setExpiryModal(true);
  };

  const saveExpiry = async () => {
    try {
      await api.put(`/chemicals/bottles/${selectedBottle.id}/expiry`, { expiry_date: newExpiry });
      showNotification({ color: 'green', title: 'Expiry updated' });
      setExpiryModal(false);
      fetchBottles();
    } catch (err) {
      showNotification({ color: 'red', title: err.response?.data?.error || 'Error' });
    }
  };

  const handlePurge = async () => {
    try {
      await api.post('/chemicals/bottles/purge');
      showNotification({ color: 'green', title: 'Old bottles cleared' });
      fetchBottles();
    } catch (err) {
      showNotification({ color: 'red', title: err.response?.data?.error || 'Error' });
    }
  };

  const filtered = bottles.filter(b => b.pin_5?.includes(searchPin));

  return (
    <>
      <Group position="apart" mb="md">
        <Title order={2}>Bottle Inventory</Title>
        <Button onClick={handlePurge} color="gray">Clear Old Bottles (30d)</Button>
      </Group>
      <TextInput
        placeholder="Search by PIN"
        icon={<IconSearch size={16} />}
        value={searchPin}
        onChange={(e) => setSearchPin(e.currentTarget.value)}
        mb="md"
      />
      <Paper withBorder>
        <Table striped>
          <thead>
            <tr>
              <th>Chemical</th>
              <th>Container</th>
              <th>PIN</th>
              <th>Status</th>
              <th>Expiry</th>
              <th>Transferred</th>
              <th>Opened</th>
              <th style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(bottle => (
              <tr key={bottle.id}>
                <td>{bottle.chemical_name}</td>
                <td>{bottle.container_type}</td>
                <td><Badge>{bottle.pin_5}</Badge></td>
                <td><Badge color={bottle.status === 'unopened' ? 'green' : 'blue'}>{bottle.status}</Badge></td>
                <td>{bottle.expiry_date ? bottle.expiry_date.slice(0,10) : '—'}</td>
                <td>{bottle.created_at ? new Date(bottle.created_at).toLocaleDateString() : '—'}</td>
                <td>{bottle.opened_at ? new Date(bottle.opened_at).toLocaleDateString() : '—'}</td>
                <td>
                  <Menu>
                    <Menu.Target><ActionIcon><IconDots size={16} /></ActionIcon></Menu.Target>
                    <Menu.Dropdown>
                      {bottle.status === 'unopened' && (
                        <Menu.Item icon={<IconBottle size={16} />} onClick={() => handleOpen(bottle)}>Open</Menu.Item>
                      )}
                      <Menu.Item icon={<IconX size={16} />} onClick={() => handleVoid(bottle)}>Void</Menu.Item>
                      <Menu.Item icon={<IconCalendar size={16} />} onClick={() => openExpiryEdit(bottle)}>Edit Expiry</Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>

      <Modal opened={expiryModal} onClose={() => setExpiryModal(false)} title="Edit Expiry Date">
        <TextInput
          type="date"
          value={newExpiry}
          onChange={(e) => setNewExpiry(e.currentTarget.value)}
          label="New Expiry Date"
        />
        <Button fullWidth mt="md" onClick={saveExpiry}>Save</Button>
      </Modal>
    </>
  );
}