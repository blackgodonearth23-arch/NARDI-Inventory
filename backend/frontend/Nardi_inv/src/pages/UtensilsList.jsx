import { useState, useEffect } from 'react';
import { Title, Table, Button, Group, Badge, Modal, TextInput, Select, NumberInput, ActionIcon, Text, Alert, Paper } from '@mantine/core';
import { IconPlus, IconTrash, IconEdit } from '@tabler/icons-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function UtensilsList() {
  const { hasRole } = useAuth();
  const [utensils, setUtensils] = useState([]);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', location_id: '', total_count: 0 });

  const fetchUtensils = async () => {
    const res = await api.get('/utensils');
    setUtensils(res.data);
  };
  const fetchLocations = async () => {
    const res = await api.get('/locations');
    setLocations(res.data);
  };
  useEffect(() => { fetchUtensils(); fetchLocations(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', location_id: '', total_count: 0 });
    setOpened(true);
  };
  const openEdit = (ut) => {
    setEditing(ut);
    setForm({ name: ut.name, location_id: String(ut.location_id), total_count: ut.total_count });
    setOpened(true);
  };
  const save = async () => {
    setError('');
    try {
      const payload = { ...form, location_id: parseInt(form.location_id), total_count: parseInt(form.total_count) };
      if (editing) await api.put(`/utensils/${editing.id}`, payload);
      else await api.post('/utensils', payload);
      setOpened(false);
      fetchUtensils();
    } catch (err) { setError(err.response?.data?.error || 'Save failed'); }
  };
  const deleteUt = async (id) => {
    if (!window.confirm('Archive this utensil?')) return;
    await api.delete(`/utensils/${id}`);
    fetchUtensils();
  };

  return (
    <>
      <Title order={2} mb="lg">Utensils Management</Title>
      <Group position="apart" mb="md">
        <Text>Total types: {utensils.length}</Text>
        {(hasRole('admin') || hasRole('lab_keeper')) && (
          <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>Add Utensil Type</Button>
        )}
      </Group>
      {error && <Alert color="red" mb="md">{error}</Alert>}
      <Paper withBorder>
        <Table striped>
          <thead><tr><th>Name</th><th>Location</th><th>Count</th><th>Actions</th></tr></thead>
          <tbody>
            {utensils.map(ut => (
              <tr key={ut.id}>
                <td>{ut.name}</td>
                <td>{ut.location_name}</td>
                <td>{ut.total_count}</td>
                <td>
                  <Group spacing="xs">
                    {(hasRole('admin') || hasRole('lab_keeper')) && (
                      <>
                        <ActionIcon variant="light" size="sm" onClick={() => openEdit(ut)}><IconEdit size={16} /></ActionIcon>
                        <ActionIcon color="red" variant="light" size="sm" onClick={() => deleteUt(ut.id)}><IconTrash size={16} /></ActionIcon>
                      </>
                    )}
                  </Group>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>

      <Modal opened={opened} onClose={() => setOpened(false)} title={editing ? 'Edit Utensil' : 'Add Utensil'}>
        <TextInput label="Name" value={form.name} onChange={e => setForm({...form, name: e.currentTarget.value})} required />
        <Select label="Location" mt="sm" data={locations.map(l => ({value: String(l.id), label: l.name}))} value={form.location_id} onChange={val => setForm({...form, location_id: val})} required />
        <NumberInput label="Total Count" mt="sm" min={0} value={form.total_count} onChange={val => setForm({...form, total_count: val})} />
        <Button fullWidth mt="xl" onClick={save}>{editing ? 'Update' : 'Create'}</Button>
      </Modal>
    </>
  );
}