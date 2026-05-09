import { useState, useEffect } from 'react';
import { Title, Table, Button, Group, Badge, Modal, TextInput, Select, NumberInput, ActionIcon, Text, Alert, Paper, MultiSelect } from '@mantine/core';
import { IconPlus, IconTrash, IconEdit, IconUserPlus } from '@tabler/icons-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function LicenseList() {
  const { hasRole } = useAuth();
  const [licenses, setLicenses] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', vendor: '', license_key: '', license_type: 'org_wide', total_seats: 1, expiration_date: '', notes: ''
  });
  // Assign modal
  const [assignOpened, setAssignOpened] = useState(false);
  const [assignLic, setAssignLic] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const fetchLicenses = async () => {
    const res = await api.get('/ict/licenses');
    setLicenses(res.data);
  };
  const fetchUsers = async () => {
    const res = await api.get('/users');
    setUsers(res.data);
  };
  useEffect(() => { fetchLicenses(); fetchUsers(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', vendor: '', license_key: '', license_type: 'org_wide', total_seats: 1, expiration_date: '', notes: '' });
    setOpened(true);
  };
  const openEdit = (lic) => {
    setEditing(lic);
    setForm({
      name: lic.name, vendor: lic.vendor || '', license_key: lic.license_key || '',
      license_type: lic.license_type, total_seats: lic.total_seats,
      expiration_date: lic.expiration_date ? lic.expiration_date.slice(0,10) : '', notes: lic.notes || ''
    });
    setOpened(true);
  };
  const save = async () => {
    setError('');
    try {
      const payload = {
        ...form,
        total_seats: form.license_type === 'individual' ? parseInt(form.total_seats) : 1,
        expiration_date: form.expiration_date || null
      };
      if (editing) await api.put(`/ict/licenses/${editing.id}`, payload);
      else await api.post('/ict/licenses', payload);
      setOpened(false);
      fetchLicenses();
    } catch (err) { setError(err.response?.data?.error || 'Save failed'); }
  };
  const deleteLic = async (id) => {
    if (!window.confirm('Archive this license?')) return;
    await api.delete(`/ict/licenses/${id}`);
    fetchLicenses();
  };

  const openAssign = (lic) => {
    setAssignLic(lic);
    const current = lic.assignments ? lic.assignments.map(a => String(a.id)) : [];
    setSelectedUsers(current);
    setAssignOpened(true);
  };
  const saveAssign = async () => {
    try {
      await api.post(`/ict/licenses/${assignLic.id}/assign`, {
        user_ids: selectedUsers.map(Number)
      });
      setAssignOpened(false);
      fetchLicenses();
    } catch (err) { alert(err.response?.data?.error || 'Assignment failed'); }
  };

  return (
    <>
      <Title order={2} mb="lg">Software Licence Management</Title>
      <Group position="apart" mb="md">
        <Text>{licenses.length} licences</Text>
        {(hasRole('admin') || hasRole('ict_keeper')) && (
          <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>Add Licence</Button>
        )}
      </Group>
      {error && <Alert color="red" mb="md">{error}</Alert>}
      <Paper withBorder>
        <Table striped>
          <thead><tr><th>Name</th><th>Vendor</th><th>Type</th><th>Seats Used/Total</th><th>Expiration</th><th>Actions</th></tr></thead>
          <tbody>
            {licenses.map(lic => (
              <tr key={lic.id}>
                <td>{lic.name}</td>
                <td>{lic.vendor || '—'}</td>
                <td><Badge color={lic.license_type === 'individual' ? 'blue' : 'gray'}>{lic.license_type}</Badge></td>
                <td>{lic.license_type === 'individual' ? `${lic.seats_used}/${lic.total_seats}` : `— / ${lic.total_seats}`}</td>
                <td>{lic.expiration_date?.slice(0,10) || '—'}</td>
                <td><Group spacing="xs">
                  {(hasRole('admin') || hasRole('ict_keeper')) && (
                    <>
                      <ActionIcon variant="light" size="sm" onClick={() => openEdit(lic)}><IconEdit size={16} /></ActionIcon>
                      <ActionIcon color="red" variant="light" size="sm" onClick={() => deleteLic(lic.id)}><IconTrash size={16} /></ActionIcon>
                      {lic.license_type === 'individual' && (
                        <ActionIcon variant="light" color="green" size="sm" onClick={() => openAssign(lic)}>
                          <IconUserPlus size={16} />
                        </ActionIcon>
                      )}
                    </>
                  )}
                </Group></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>

      <Modal opened={opened} onClose={() => setOpened(false)} title={editing ? 'Edit Licence' : 'Add Licence'}>
        <TextInput label="Name" value={form.name} onChange={e => setForm({...form, name: e.currentTarget.value})} required />
        <TextInput label="Vendor" mt="sm" value={form.vendor} onChange={e => setForm({...form, vendor: e.currentTarget.value})} />
        <TextInput label="License Key" mt="sm" value={form.license_key} onChange={e => setForm({...form, license_key: e.currentTarget.value})} />
        <Select label="Type" mt="sm" data={[{value:'org_wide',label:'Org-Wide'},{value:'individual',label:'Individual'}]} value={form.license_type} onChange={val => setForm({...form, license_type: val})} />
        {form.license_type === 'individual' && (
          <NumberInput label="Total Seats" mt="sm" min={1} value={form.total_seats} onChange={val => setForm({...form, total_seats: val})} />
        )}
        <TextInput type="date" label="Expiration Date" mt="sm" value={form.expiration_date} onChange={e => setForm({...form, expiration_date: e.currentTarget.value})} />
        <TextInput label="Notes" mt="sm" value={form.notes} onChange={e => setForm({...form, notes: e.currentTarget.value})} />
          <TextInput label="Procured By" mt="sm" value={form.procured_by} onChange={e => setForm({...form, procured_by: e.currentTarget.value})} />
        <Button fullWidth mt="xl" onClick={save}>{editing ? 'Update' : 'Create'}</Button>
      </Modal>

      <Modal opened={assignOpened} onClose={() => setAssignOpened(false)} title={`Assign Users – ${assignLic?.name}`}>
        <MultiSelect
          data={users.map(u => ({ value: String(u.id), label: `${u.display_name} (${u.email})` }))}
          value={selectedUsers}
          onChange={setSelectedUsers}
          searchable
          placeholder="Select users"
          mb="md"
        />
        
        <Button fullWidth onClick={saveAssign}>Save Assignments</Button>
      </Modal>
    </>
  );
}