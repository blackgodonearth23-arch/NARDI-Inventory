import { useState, useEffect } from 'react';
import { Title, Table, Button, Group, Badge, Modal, TextInput, Select, ActionIcon, Text, Alert, Paper } from '@mantine/core';
import { IconPlus, IconTrash, IconEdit } from '@tabler/icons-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function ICTHardwareList() {
  const { hasRole } = useAuth();
  const [hardware, setHardware] = useState([]);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    org_serial: '', type: 'pc', model: '', status: 'available',
    location_id: '', assigned_to_user_id: '', purchase_date: '', notes: ''
  });

  const fetchHardware = async () => {
    const res = await api.get('/ict/hardware');
    setHardware(res.data);
  };
  const fetchLocations = async () => {
    const res = await api.get('/locations');
    setLocations(res.data);
  };
  useEffect(() => { fetchHardware(); fetchLocations(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ org_serial: '', type: 'pc', model: '', status: 'available', location_id: '', assigned_to_user_id: '', purchase_date: '', notes: '' });
    setOpened(true);
  };
  const openEdit = (hw) => {
    setEditing(hw);
    setForm({
      org_serial: hw.org_serial, type: hw.type, model: hw.model || '', status: hw.status,
      location_id: hw.location_id ? String(hw.location_id) : '',
      assigned_to_user_id: hw.assigned_to_user_id ? String(hw.assigned_to_user_id) : '',
      purchase_date: hw.purchase_date ? hw.purchase_date.slice(0,10) : '', notes: hw.notes || ''
    });
    setOpened(true);
  };
  const save = async () => {
    setError('');
    const payload = {
      ...form,
      location_id: form.location_id ? parseInt(form.location_id) : null,
      assigned_to_user_id: form.assigned_to_user_id ? parseInt(form.assigned_to_user_id) : null,
      purchase_date: form.purchase_date || null
    };
    try {
      if (editing) await api.put(`/ict/hardware/${editing.id}`, payload);
      else await api.post('/ict/hardware', payload);
      setOpened(false);
      fetchHardware();
    } catch (err) { setError(err.response?.data?.error || 'Save failed'); }
  };
  const deleteHw = async (id) => {
    if (!window.confirm('Archive this item?')) return;
    await api.delete(`/ict/hardware/${id}`);
    fetchHardware();
  };

  return (
    <>
      <Title order={2} mb="lg">ICT Hardware Management</Title>
      <Group position="apart" mb="md">
        <Text>{hardware.length} devices</Text>
        {(hasRole('admin') || hasRole('ict_keeper')) && (
          <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>Add Hardware</Button>
        )}
      </Group>
      {error && <Alert color="red" mb="md">{error}</Alert>}
      <Paper withBorder>
        <Table striped>
          <thead><tr><th>Serial</th><th>Type</th><th>Model</th><th>Status</th><th>Location</th><th>Assigned To</th><th>Actions</th></tr></thead>
          <tbody>
            {hardware.map(hw => (
              <tr key={hw.id}>
                <td>{hw.org_serial}</td>
                <td><Badge>{hw.type}</Badge></td>
                <td>{hw.model || '—'}</td>
                <td><Badge color={hw.status === 'under_repair' ? 'red' : 'green'}>{hw.status}</Badge></td>
                <td>{hw.location_name || '—'}</td>
                <td>{hw.assigned_user_name || '—'}</td>
                <td><Group spacing="xs">
                  {(hasRole('admin') || hasRole('ict_keeper')) && (
                    <>
                      <ActionIcon variant="light" size="sm" onClick={() => openEdit(hw)}><IconEdit size={16} /></ActionIcon>
                      <ActionIcon color="red" variant="light" size="sm" onClick={() => deleteHw(hw.id)}><IconTrash size={16} /></ActionIcon>
                    </>
                  )}
                </Group></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>

      <Modal opened={opened} onClose={() => setOpened(false)} title={editing ? 'Edit Hardware' : 'Add Hardware'}>
        <TextInput label="Serial" value={form.org_serial} onChange={e => setForm({...form, org_serial: e.currentTarget.value})} required />
        <Select label="Type" mt="sm" data={['pc','printer','monitor','peripheral','other']} value={form.type} onChange={val => setForm({...form, type: val})} />
        <TextInput label="Model" mt="sm" value={form.model} onChange={e => setForm({...form, model: e.currentTarget.value})} />
        <Select label="Status" mt="sm" data={['available','in_use','under_repair','decommissioned']} value={form.status} onChange={val => setForm({...form, status: val})} />
        <Select label="Location" mt="sm" data={locations.map(l => ({value: String(l.id), label: l.name}))} value={form.location_id} onChange={val => setForm({...form, location_id: val})} clearable />
        <TextInput label="Assigned User ID" mt="sm" value={form.assigned_to_user_id} onChange={e => setForm({...form, assigned_to_user_id: e.currentTarget.value})} />
        <TextInput type="date" label="Purchase Date" mt="sm" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.currentTarget.value})} />
        <TextInput label="Notes" mt="sm" value={form.notes} onChange={e => setForm({...form, notes: e.currentTarget.value})} />
        <Button fullWidth mt="xl" onClick={save}>{editing ? 'Update' : 'Create'}</Button>
      </Modal>
    </>
  );
}