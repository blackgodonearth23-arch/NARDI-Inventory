import { useState, useEffect } from 'react';
import {
  Title, Table, Button, Group, Modal, TextInput, ActionIcon,
  Paper, Grid
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function LicenseList() {
  const { hasRole } = useAuth();
  const [licenses, setLicenses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', vendor: '', package: '', duration: '',
    expiration_date: '', provider: '', notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchLicenses(); }, []);

  const fetchLicenses = async () => {
    const res = await api.get('/ict/licenses');
    setLicenses(res.data);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', vendor: '', package: '', duration: '', expiration_date: '', provider: '', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (lic) => {
    setEditing(lic);
    setForm({
      name: lic.name || '',
      vendor: lic.vendor || '',
      package: lic.package || '',
      duration: lic.duration || '',
      expiration_date: lic.expiration_date ? lic.expiration_date.slice(0,10) : '',
      provider: lic.provider || '',
      notes: lic.notes || ''
    });
    setModalOpen(true);
  };

  const save = async () => {
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        vendor: form.vendor || null,
        package: form.package || null,
        duration: form.duration || null,
        expiration_date: form.expiration_date || null,
        provider: form.provider || null,
        notes: form.notes || null
      };
      if (editing) {
        await api.put(`/ict/licenses/${editing.id}`, payload);
      } else {
        await api.post('/ict/licenses', payload);
      }
      showNotification({ color: 'green', title: 'Licence saved' });
      setModalOpen(false);
      fetchLicenses();
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: err.response?.data?.error });
    } finally { setSubmitting(false); }
  };

  const deleteLic = async (id) => {
    if (!window.confirm('Archive this licence?')) return;
    await api.delete(`/ict/licenses/${id}`);
    fetchLicenses();
  };

  return (
    <>
      <Title order={2} mb="lg">Software Licence Management</Title>
      <Group mb="md">
        <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>Add Licence</Button>
      </Group>
      <Paper withBorder>
        <Table striped>
          <thead>
            <tr><th>Name</th><th>Vendor</th><th>Package</th><th>Duration</th><th>Expiration</th><th>Provider</th><th style={{width:100}}>Actions</th></tr>
          </thead>
          <tbody>
            {licenses.map(lic => (
              <tr key={lic.id}>
                <td>{lic.name}</td>
                <td>{lic.vendor || '—'}</td>
                <td>{lic.package || '—'}</td>
                <td>{lic.duration || '—'}</td>
                <td>{lic.expiration_date ? new Date(lic.expiration_date).toLocaleDateString() : '—'}</td>
                <td>{lic.provider || '—'}</td>
                <td>
                  <Group gap="xs">
                    <ActionIcon color="blue" onClick={() => openEdit(lic)}><IconEdit size={16} /></ActionIcon>
                    <ActionIcon color="red" onClick={() => deleteLic(lic.id)}><IconTrash size={16} /></ActionIcon>
                  </Group>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Licence' : 'Add Licence'}>
        <Grid>
          <Grid.Col span={6}><TextInput label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></Grid.Col>
          <Grid.Col span={6}><TextInput label="Vendor" value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} /></Grid.Col>
          <Grid.Col span={6}><TextInput label="Package" value={form.package} onChange={e => setForm({...form, package: e.target.value})} /></Grid.Col>
          <Grid.Col span={6}><TextInput label="Duration" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} /></Grid.Col>
          <Grid.Col span={4}><TextInput type="date" label="Expiration Date" value={form.expiration_date} onChange={e => setForm({...form, expiration_date: e.target.value})} /></Grid.Col>
          <Grid.Col span={4}><TextInput label="Provider" value={form.provider} onChange={e => setForm({...form, provider: e.target.value})} /></Grid.Col>
          <Grid.Col span={12}><TextInput label="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></Grid.Col>
        </Grid>
        <Button fullWidth mt="xl" loading={submitting} onClick={save}>{editing ? 'Update' : 'Create'}</Button>
      </Modal>
    </>
  );
}