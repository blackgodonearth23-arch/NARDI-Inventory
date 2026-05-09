import { useState, useEffect } from 'react';
import { Title, Table, Button, Group, Badge, Modal, TextInput, Select, NumberInput, ActionIcon, Text, Alert, Paper } from '@mantine/core';
import { IconPlus, IconTrash, IconEdit } from '@tabler/icons-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function EquipmentList() {
  const { hasRole } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    org_serial: '', name: '', type: '', location_id: '',
    status: 'available', assigned_to_user_id: '', purchase_date: '', notes: ''
  });

  const fetchEquipment = async () => {
    const res = await api.get('/equipment');
    setEquipment(res.data);
  };
  const fetchLocations = async () => {
    const res = await api.get('/locations');
    setLocations(res.data);
  };
  useEffect(() => { fetchEquipment(); fetchLocations(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ org_serial: '', name: '', type: '', location_id: '', status: 'available', assigned_to_user_id: '', purchase_date: '', notes: '' });
    setOpened(true);
  };
  const openEdit = (equip) => {
    setEditing(equip);
    setForm({
      org_serial: equip.org_serial,
      name: equip.name,
      type: equip.type,
      location_id: String(equip.location_id),
      status: equip.status,
      assigned_to_user_id: equip.assigned_to_user_id ? String(equip.assigned_to_user_id) : '',
      purchase_date: equip.purchase_date ? equip.purchase_date.slice(0,10) : '',
      notes: equip.notes || ''
    });
    setOpened(true);
  };
  const save = async () => {
    setError('');
    const payload = {
      ...form,
      location_id: parseInt(form.location_id),
      assigned_to_user_id: form.assigned_to_user_id ? parseInt(form.assigned_to_user_id) : null,
      purchase_date: form.purchase_date || null
    };
    try {
      if (editing) await api.put(`/equipment/${editing.id}`, payload);
      else await api.post('/equipment', payload);
      setOpened(false);
      fetchEquipment();
    } catch (err) { setError(err.response?.data?.error || 'Save failed'); }
  };
  const deleteEquip = async (id) => {
    if (!window.confirm('Archive this equipment?')) return;
    await api.delete(`/equipment/${id}`);
    fetchEquipment();
  };

  return (
    <>
      <Title order={2} mb="lg">Equipment Management</Title>
      <Group position="apart" mb="md">
        <Text>Total pieces: {equipment.length}</Text>
        {(hasRole('admin') || hasRole('lab_keeper')) && (
          <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>Add Equipment</Button>
        )}
      </Group>
      {error && <Alert color="red" mb="md">{error}</Alert>}
      <Paper withBorder>
        <Table striped>
          <thead><tr><th>Serial</th><th>Name</th><th>Type</th><th>Location</th><th>Status</th><th>Assigned To</th><th>Actions</th></tr></thead>
          <tbody>
            {equipment.map(equip => (
              <tr key={equip.id}>
                <td>{equip.org_serial}</td>
                <td>{equip.name}</td>
                <td>{equip.type}</td>
                <td>{equip.location_name}</td>
                <td><Badge color={equip.status === 'broken' ? 'red' : 'green'}>{equip.status}</Badge></td>
                <td>{equip.assigned_to_user_id ? `User #${equip.assigned_to_user_id}` : '—'}</td>
                <td>
                  <Group spacing="xs">
                    {(hasRole('admin') || hasRole('lab_keeper')) && (
                      <>
                        <ActionIcon variant="light" size="sm" onClick={() => openEdit(equip)}><IconEdit size={16} /></ActionIcon>
                        <ActionIcon color="red" variant="light" size="sm" onClick={() => deleteEquip(equip.id)}><IconTrash size={16} /></ActionIcon>
                      </>
                    )}
                  </Group>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>

      <Modal opened={opened} onClose={() => setOpened(false)} title={editing ? 'Edit Equipment' : 'Add Equipment'}>
        <TextInput label="Organisation Serial" value={form.org_serial} onChange={e => setForm({...form, org_serial: e.currentTarget.value})} required />
        <TextInput label="Name" mt="sm" value={form.name} onChange={e => setForm({...form, name: e.currentTarget.value})} required />
        <TextInput label="Type" mt="sm" value={form.type} onChange={e => setForm({...form, type: e.currentTarget.value})} required />
        <Select label="Location" mt="sm" data={locations.map(l => ({value: String(l.id), label: l.name}))} value={form.location_id} onChange={val => setForm({...form, location_id: val})} required />
        <Select label="Status" mt="sm" data={['available','in_use','broken','retired']} value={form.status} onChange={val => setForm({...form, status: val})} />
        <TextInput label="Assigned User ID (optional)" mt="sm" value={form.assigned_to_user_id} onChange={e => setForm({...form, assigned_to_user_id: e.currentTarget.value})} />
        <TextInput type="date" label="Purchase Date" mt="sm" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.currentTarget.value})} />
        <TextInput label="Notes" mt="sm" value={form.notes} onChange={e => setForm({...form, notes: e.currentTarget.value})} />
        <Button fullWidth mt="xl" onClick={save}>{editing ? 'Update' : 'Create'}</Button>
      </Modal>
    </>
  );
}