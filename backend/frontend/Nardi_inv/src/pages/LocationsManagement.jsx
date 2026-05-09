import { useState, useEffect } from 'react';
import { Title, Paper, Table, Button, Modal, TextInput, Select, Group, ActionIcon, Grid } from '@mantine/core';
import { IconEdit, IconTrash, IconLocationPlus } from '@tabler/icons-react';
import api from '../api/axios';
import { showNotification } from '@mantine/notifications';
import { useAuth } from '../context/AuthContext';

export default function LocationsManagement() {
  const [locations, setLocations] = useState([]);
  const [labs, setLabs] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editLoc, setEditLoc] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'lab_sub', lab_id: null });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchLocations = async () => {
    try {
      const res = await api.get('/locations');
      setLocations(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchLabs = async () => {
    if (user.role === 'admin') {
      const res = await api.get('/labs');
      setLabs(res.data);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchLabs();
  }, []);

  const openCreate = () => {
    setEditLoc(null);
    setForm({ name: '', type: 'lab_sub', lab_id: user.lab_id || null });
    setModalOpen(true);
  };

  const openEdit = (loc) => {
    setEditLoc(loc);
    setForm({ name: loc.name, type: loc.type, lab_id: loc.lab_id });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = { ...form };
      if (editLoc) {
        await api.put(`/locations/${editLoc.id}`, payload);
      } else {
        await api.post('/locations', payload);
      }
      showNotification({ color: 'green', title: 'Location saved' });
      setModalOpen(false);
      fetchLocations();
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: err.response?.data?.error });
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this location?')) {
      await api.delete(`/locations/${id}`);
      fetchLocations();
    }
  };

  return (
    <>
      <Title order={2} mb="lg">Locations</Title>
      <Group mb="md">
        <Button leftSection={<IconLocationPlus />} onClick={openCreate}>Add Location</Button>
      </Group>
      <Paper withBorder>
        <Table>
          <thead>
            <tr><th>Name</th><th>Type</th><th>Lab</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {locations.map(loc => (
              <tr key={loc.id}>
                <td>{loc.name}</td>
                <td>{loc.type === 'primary' ? 'Primary Storage' : 'Sub-storage'}</td>
                <td>{labs.find(l=>l.id===loc.lab_id)?.name || labs.find(l=>l.id===user.lab_id)?.name || '—'}</td>
                <td>
                  <Group gap="xs">
                    <ActionIcon color="blue" onClick={() => openEdit(loc)}><IconEdit size={16} /></ActionIcon>
                    <ActionIcon color="red" onClick={() => handleDelete(loc.id)}><IconTrash size={16} /></ActionIcon>
                  </Group>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editLoc ? 'Edit Location' : 'Add Location'}>
        <Grid>
          <Grid.Col span={12}><TextInput label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Type"
              data={[{ value: 'primary', label: 'Primary Storage' }, { value: 'lab_sub', label: 'Sub-storage' }]}
              value={form.type}
              onChange={val => setForm({...form, type: val})}
            />
          </Grid.Col>
          {user.role === 'admin' && (
            <Grid.Col span={6}>
              <Select
                label="Lab"
                data={labs.map(l => ({ value: l.id.toString(), label: l.name }))}
                value={form.lab_id?.toString()}
                onChange={val => setForm({...form, lab_id: parseInt(val)})}
                required
              />
            </Grid.Col>
          )}
        </Grid>
        <Group mt="md" justify="flex-end">
          <Button variant="default" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} disabled={loading}>Save</Button>
        </Group>
      </Modal>
    </>
  );
}