import { useState, useEffect } from 'react';
import {
  Title, Table, Button, Group, Badge, Modal, TextInput, Select, ActionIcon, Text, Alert, Paper, Grid, Tooltip
} from '@mantine/core';
import { IconPlus, IconTrash, IconEdit, IconTransfer } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const HARDWARE_TYPES = ['laptop', 'desktop', 'phone', 'printer', 'projector', 'other'];
const STATUSES = ['available', 'in_use', 'under_repair', 'decommissioned'];

export default function ICTHardwareList() {
  const { user, hasRole } = useAuth();
  const [hardware, setHardware] = useState([]);
  const [branches, setBranches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [error, setError] = useState('');

  // Form state
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm());
  const [submitting, setSubmitting] = useState(false);

  // Transfer modal
  const [transferOpened, setTransferOpened] = useState(false);
  const [transferItem, setTransferItem] = useState(null);
  const [transferForm, setTransferForm] = useState({ to_lab_id: '', to_location_id: '', new_computer_name: '' });

  function initialForm() {
    return {
      computer_name: '', org_serial: '', type: 'laptop', type_other: '', model: '',
      status: 'available', lab_id: (user.role === 'ict_keeper' ? user.lab_id?.toString() : ''),
      location_id: '', assigned_to_user_id: '', assigned_to_employee: '',
      purchase_date: '', notes: ''
    };
  }

  const fetchHardware = async () => {
    try {
      const res = await api.get('/ict/hardware');
      setHardware(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchSupportData = async () => {
    try {
      const [labsRes, locsRes, usersRes] = await Promise.all([
        api.get('/labs'),
        api.get('/locations'),
        api.get('/users')
      ]);
      setBranches(labsRes.data);
      setLocations(locsRes.data);
      setUsersList(usersRes.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchHardware();
    fetchSupportData();
  }, []);

  // ---------- CRUD ----------
  const openAdd = () => {
    setEditing(null);
    setForm(initialForm());
    setOpened(true);
  };

  const openEdit = (hw) => {
    setEditing(hw);
    const typeIsCustom = !HARDWARE_TYPES.slice(0, -1).includes(hw.type);
    setForm({
      computer_name: hw.computer_name,
      org_serial: hw.org_serial,
      type: typeIsCustom ? 'other' : hw.type,
      type_other: typeIsCustom ? hw.type : '',
      model: hw.model || '',
      status: hw.status,
      lab_id: hw.lab_id?.toString() || '',
      location_id: hw.location_id?.toString() || '',
      assigned_to_user_id: hw.assigned_to_user_id?.toString() || '',
      assigned_to_employee: hw.assigned_to_employee || '',
      purchase_date: hw.purchase_date?.slice(0,10) || '',
      notes: hw.notes || ''
    });
    setOpened(true);
  };

  const save = async () => {
    setError('');
    if (!form.computer_name || !form.org_serial || !form.lab_id) {
      setError('Computer name, serial, and branch are required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        computer_name: form.computer_name,
        org_serial: form.org_serial,
        type: form.type === 'other' ? form.type_other : form.type,
        model: form.model || null,
        status: form.status,
        lab_id: parseInt(form.lab_id),
        location_id: form.location_id ? parseInt(form.location_id) : null,
        assigned_to_user_id: form.assigned_to_user_id ? parseInt(form.assigned_to_user_id) : null,
        assigned_to_employee: form.assigned_to_employee || null,
        purchase_date: form.purchase_date || null,
        notes: form.notes || null
      };
      if (editing) {
        await api.put(`/ict/hardware/${editing.id}`, payload);
      } else {
        await api.post('/ict/hardware', payload);
      }
      showNotification({ color: 'green', title: 'Hardware saved' });
      setOpened(false);
      fetchHardware();
    } catch (err) {
      const msg = err.response?.data?.error || 'Save failed';
      setError(msg);
    } finally { setSubmitting(false); }
  };

  const deleteHw = async (id) => {
    if (!window.confirm('Archive this item?')) return;
    await api.delete(`/ict/hardware/${id}`);
    fetchHardware();
  };

  // ---------- Transfer ----------
  const openTransfer = (hw) => {
    setTransferItem(hw);
    setTransferForm({
      to_lab_id: '',
      to_location_id: '',
      new_computer_name: hw.computer_name
    });
    setTransferOpened(true);
  };

  const executeTransfer = async () => {
    if (!transferForm.to_lab_id || !transferForm.new_computer_name) return;
    setSubmitting(true);
    try {
      await api.post(`/ict/hardware/${transferItem.id}/transfer`, {
        to_lab_id: parseInt(transferForm.to_lab_id),
        to_location_id: transferForm.to_location_id ? parseInt(transferForm.to_location_id) : null,
        new_computer_name: transferForm.new_computer_name
      });
      showNotification({ color: 'green', title: 'Transfer completed' });
      setTransferOpened(false);
      fetchHardware();
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: err.response?.data?.error });
    } finally { setSubmitting(false); }
  };

  // For keeper, branch is read-only
  const isKeeper = user.role === 'ict_keeper';

  return (
    <>
      <Title order={2} mb="lg">ICT Hardware Management</Title>

      <Group mb="md">
        <Text>{hardware.length} devices</Text>
        <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>Add Hardware</Button>
      </Group>

      {error && <Alert color="red" mb="md">{error}</Alert>}

      <Paper withBorder>
        <Table striped>
          <thead>
            <tr>
              <th>Computer Name</th><th>Serial</th><th>Type</th><th>Status</th>
              <th>Branch</th><th>Location</th><th>Assigned To</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {hardware.map(hw => (
              <tr key={hw.id}>
                <td>{hw.computer_name}</td>
                <td>{hw.org_serial}</td>
                <td><Badge>{hw.type}</Badge></td>
                <td><Badge color={hw.status === 'under_repair' ? 'red' : 'green'}>{hw.status}</Badge></td>
                <td>{hw.lab_name || hw.lab_id}</td>
                <td>{hw.location_name || '—'}</td>
                <td>{hw.assigned_user_name || hw.assigned_to_employee || '—'}</td>
                <td>
                  <Group gap="xs">
                    <ActionIcon color="blue" onClick={() => openEdit(hw)}><IconEdit size={16} /></ActionIcon>
                    <ActionIcon color="orange" onClick={() => openTransfer(hw)}><IconTransfer size={16} /></ActionIcon>
                    <ActionIcon color="red" onClick={() => deleteHw(hw.id)}><IconTrash size={16} /></ActionIcon>
                  </Group>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>

      {/* Hardware Add/Edit Modal */}
      <Modal opened={opened} onClose={() => setOpened(false)} title={editing ? 'Edit Hardware' : 'Add Hardware'} size="lg">
        <Grid>
          <Grid.Col span={6}>
            <TextInput label="Computer Name" value={form.computer_name} onChange={e => setForm({...form, computer_name: e.currentTarget.value})} required />
          </Grid.Col>
          <Grid.Col span={6}>
            <TextInput label="Serial Number" value={form.org_serial} onChange={e => setForm({...form, org_serial: e.currentTarget.value})} required />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Type"
              data={HARDWARE_TYPES}
              value={form.type}
              onChange={val => setForm({...form, type: val, type_other: val !== 'other' ? '' : form.type_other})}
            />
            {form.type === 'other' && (
              <TextInput mt="xs" label="Specify type" value={form.type_other} onChange={e => setForm({...form, type_other: e.currentTarget.value})} required />
            )}
          </Grid.Col>
          <Grid.Col span={6}>
            <Select label="Status" data={STATUSES} value={form.status} onChange={val => setForm({...form, status: val})} />
          </Grid.Col>
          <Grid.Col span={6}>
            {isKeeper ? (
              <TextInput label="Branch" value={branches.find(l => l.id === user.lab_id)?.name || ''} disabled />
            ) : (
              <Select
                label="Branch"
                data={branches.map(l => ({ value: l.id.toString(), label: l.name }))}
                value={form.lab_id}
                onChange={val => setForm({...form, lab_id: val})}
                required
              />
            )}
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Location"
              data={locations.map(l => ({ value: l.id.toString(), label: l.name }))}
              value={form.location_id}
              onChange={val => setForm({...form, location_id: val})}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Assign to User (optional)"
              data={usersList.map(u => ({ value: u.id.toString(), label: `${u.display_name} (${u.email})` }))}
              value={form.assigned_to_user_id}
              onChange={val => setForm({...form, assigned_to_user_id: val})}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <TextInput label="Assign to Employee (non-user)" value={form.assigned_to_employee} onChange={e => setForm({...form, assigned_to_employee: e.currentTarget.value})} />
          </Grid.Col>
          <Grid.Col span={6}>
            <TextInput type="date" label="Purchase Date" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.currentTarget.value})} />
          </Grid.Col>
          <Grid.Col span={6}>
            <TextInput label="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.currentTarget.value})} />
          </Grid.Col>
        </Grid>
        <Button fullWidth mt="xl" loading={submitting} onClick={save}>
          {editing ? 'Update' : 'Create'}
        </Button>
      </Modal>

      {/* Transfer Modal */}
      <Modal opened={transferOpened} onClose={() => setTransferOpened(false)} title={`Transfer ${transferItem?.computer_name}`}>
        <Select
          label="Destination Branch"
          data={branches.filter(b => b.id !== transferItem?.lab_id).map(b => ({ value: b.id.toString(), label: b.name }))}
          value={transferForm.to_lab_id}
          onChange={val => setTransferForm({...transferForm, to_lab_id: val})}
          required
        />
        <Select
          label="Destination Location (optional)"
          mt="sm"
          data={locations.filter(l => l.lab_id === parseInt(transferForm.to_lab_id)).map(l => ({ value: l.id.toString(), label: l.name }))}
          value={transferForm.to_location_id}
          onChange={val => setTransferForm({...transferForm, to_location_id: val})}
          clearable
        />
        <TextInput
          label="New Computer Name"
          mt="sm"
          value={transferForm.new_computer_name}
          onChange={e => setTransferForm({...transferForm, new_computer_name: e.currentTarget.value})}
          required
        />
        <Button fullWidth mt="xl" loading={submitting} onClick={executeTransfer}>Transfer</Button>
      </Modal>
    </>
  );
}