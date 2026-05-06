import { useState, useEffect } from 'react';
import {
  Title, Table, Button, Group, Badge, Modal, TextInput, Select,
  ActionIcon, Text, Alert, Space, Stack, Paper
} from '@mantine/core';
import { IconPlus, IconTrash, IconEdit, IconMapPin } from '@tabler/icons-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function LabsManagement() {
  const { hasRole } = useAuth();   // role check for disabling buttons
  const [labs, setLabs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');

  // Lab form state
  const [labOpened, setLabOpened] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [labForm, setLabForm] = useState({ name: '', description: '' });

  // Location form state
  const [locOpened, setLocOpened] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);
  const [locForm, setLocForm] = useState({ name: '', type: 'lab_sub', lab_id: '', parent_id: '', description: '' });

  const fetchData = async () => {
    try {
      const [labsRes, locsRes] = await Promise.all([
        api.get('/labs'),
        api.get('/locations')
      ]);
      setLabs(labsRes.data);
      setLocations(locsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- Lab handlers ---
  const openAddLab = () => {
    setEditingLab(null);
    setLabForm({ name: '', description: '' });
    setLabOpened(true);
  };

  const openEditLab = (lab) => {
    setEditingLab(lab);
    setLabForm({ name: lab.name, description: lab.description || '' });
    setLabOpened(true);
  };

  const saveLab = async () => {
    setError('');
    try {
      if (editingLab) {
        await api.put(`/labs/${editingLab.id}`, labForm);
      } else {
        await api.post('/labs', labForm);
      }
      setLabOpened(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Lab save failed');
    }
  };

  const deleteLab = async (labId) => {
    if (!window.confirm('Delete this lab? This will also delete its sub‑storages.')) return;
    try {
      await api.delete(`/labs/${labId}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Deletion failed');
    }
  };

  // --- Location handlers ---
  const openAddLoc = () => {
    setEditingLoc(null);
    setLocForm({ name: '', type: 'lab_sub', lab_id: '', parent_id: '', description: '' });
    setLocOpened(true);
  };

  const openEditLoc = (loc) => {
    setEditingLoc(loc);
    setLocForm({
      name: loc.name,
      type: loc.type,
      lab_id: loc.lab_id || '',
      parent_id: loc.parent_id || '',
      description: loc.description || ''
    });
    setLocOpened(true);
  };

  const saveLoc = async () => {
    setError('');
    try {
      const payload = {
        ...locForm,
        lab_id: locForm.lab_id ? parseInt(locForm.lab_id) : null,
        parent_id: locForm.parent_id ? parseInt(locForm.parent_id) : null
      };
      if (editingLoc) {
        await api.put(`/locations/${editingLoc.id}`, payload);
      } else {
        await api.post('/locations', payload);
      }
      setLocOpened(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Location save failed');
    }
  };

  const deleteLoc = async (locId) => {
    if (!window.confirm('Delete this location?')) return;
    try {
      await api.delete(`/locations/${locId}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Deletion failed');
    }
  };

  return (
    <>
      <Title order={2} mb="lg">Labs & Locations</Title>

      {/* === Labs section (admin only) === */}
      <Paper withBorder p="md" mb="xl">
        <Group position="apart" mb="sm">
          <Text weight={600}>Laboratories</Text>
          {hasRole('admin') && (
            <Button size="xs" leftSection={<IconPlus size={16} />} onClick={openAddLab}>
              Add Lab
            </Button>
          )}
        </Group>

        {error && <Alert color="red" mb="sm">{error}</Alert>}

        <Table striped>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {labs.map((lab) => (
              <tr key={lab.id}>
                <td>{lab.name}</td>
                <td>{lab.description || '—'}</td>
                <td>
                  <Group spacing="xs">
                    {hasRole('admin') && (
                      <>
                        <ActionIcon variant="light" size="sm" onClick={() => openEditLab(lab)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon color="red" variant="light" size="sm" onClick={() => deleteLab(lab.id)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </>
                    )}
                  </Group>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>

      {/* === Locations section (Admin & Lab Keeper) === */}
      <Paper withBorder p="md">
        <Group position="apart" mb="sm">
          <Text weight={600}>Storage Locations</Text>
          {(hasRole('admin') || hasRole('lab_keeper')) && (
            <Button size="xs" leftSection={<IconPlus size={16} />} onClick={openAddLoc}>
              Add Location
            </Button>
          )}
        </Group>

        <Table striped>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Lab</th>
              <th>Parent</th>
              <th style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((loc) => {
              const lab = labs.find(l => l.id === loc.lab_id);
              const parent = locations.find(l => l.id === loc.parent_id);
              return (
                <tr key={loc.id}>
                  <td>{loc.name}</td>
                  <td>
                    <Badge color={loc.type === 'main' ? 'red' : 'blue'}>
                      {loc.type.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td>{lab ? lab.name : '—'}</td>
                  <td>{parent ? parent.name : '—'}</td>
                  <td>
                    <Group spacing="xs">
                      {(hasRole('admin') || hasRole('lab_keeper')) && (
                        <>
                          <ActionIcon variant="light" size="sm" onClick={() => openEditLoc(loc)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon color="red" variant="light" size="sm" onClick={() => deleteLoc(loc.id)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </>
                      )}
                    </Group>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Paper>

      {/* --- Lab Modal --- */}
      <Modal opened={labOpened} onClose={() => setLabOpened(false)} title={editingLab ? 'Edit Lab' : 'Add New Lab'}>
        <TextInput label="Name" value={labForm.name} onChange={e => setLabForm({ ...labForm, name: e.currentTarget.value })} required />
        <TextInput label="Description" mt="sm" value={labForm.description} onChange={e => setLabForm({ ...labForm, description: e.currentTarget.value })} />
        <Button fullWidth mt="xl" onClick={saveLab}>{editingLab ? 'Update' : 'Create'}</Button>
      </Modal>

      {/* --- Location Modal --- */}
      <Modal opened={locOpened} onClose={() => setLocOpened(false)} title={editingLoc ? 'Edit Location' : 'Add New Location'}>
        <TextInput label="Name" value={locForm.name} onChange={e => setLocForm({ ...locForm, name: e.currentTarget.value })} required />
        <Select
          label="Type"
          mt="sm"
          data={[
            { value: 'main', label: 'Main Storage' },
            { value: 'lab_sub', label: 'Lab Sub‑storage' }
          ]}
          value={locForm.type}
          onChange={val => setLocForm({ ...locForm, type: val })}
        />
        {locForm.type === 'lab_sub' && (
          <Select
            label="Lab"
            mt="sm"
            data={labs.map(l => ({ value: String(l.id), label: l.name }))}
            value={locForm.lab_id ? String(locForm.lab_id) : null}
            onChange={val => setLocForm({ ...locForm, lab_id: val })}
            required
          />
        )}
        <Select
          label="Parent Location (optional)"
          mt="sm"
          data={locations.map(l => ({ value: String(l.id), label: l.name }))}
          value={locForm.parent_id ? String(locForm.parent_id) : null}
          onChange={val => setLocForm({ ...locForm, parent_id: val })}
          clearable
        />
        <TextInput label="Description" mt="sm" value={locForm.description} onChange={e => setLocForm({ ...locForm, description: e.currentTarget.value })} />
        <Button fullWidth mt="xl" onClick={saveLoc}>{editingLoc ? 'Update' : 'Create'}</Button>
      </Modal>
    </>
  );
}