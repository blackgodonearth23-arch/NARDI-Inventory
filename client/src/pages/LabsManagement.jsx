import { useState, useEffect } from 'react';
import {
  Title, Table, Button, Group, Badge, Modal, TextInput, Select,
  ActionIcon, Text, Alert, Paper, Stack, Menu
} from '@mantine/core';
import { IconPlus, IconTrash, IconEdit, IconMapPin, IconDots } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function LabsManagement() {
  const { hasRole, user } = useAuth();
  const [labs, setLabs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');

  // Lab form state
  const [labOpened, setLabOpened] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [labForm, setLabForm] = useState({ name: '', description: '' });
  const [savingLab, setSavingLab] = useState(false);

  // Location form state
  const [locOpened, setLocOpened] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);
  const [locForm, setLocForm] = useState({ name: '', type: 'lab_sub', lab_id: '', description: '' });
  const [savingLoc, setSavingLoc] = useState(false);

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

  // ---------- Lab actions (admin only) ----------
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
    setSavingLab(true);
    try {
      if (editingLab) {
        await api.put(`/labs/${editingLab.id}`, labForm);
      } else {
        await api.post('/labs', labForm);
      }
      showNotification({ color: 'green', title: 'Lab saved' });
      setLabOpened(false);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.error || 'Lab save failed';
      setError(msg);
    } finally {
      setSavingLab(false);
    }
  };

  const deleteLab = async (labId) => {
    if (!window.confirm('Delete this lab? This will also delete its sub‑storages.')) return;
    try {
      await api.delete(`/labs/${labId}`);
      showNotification({ color: 'orange', title: 'Lab deleted' });
      fetchData();
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: err.response?.data?.error || 'Deletion failed' });
    }
  };

  // ---------- Location actions (admin + keeper) ----------
  const openAddLoc = () => {
    setEditingLoc(null);
    setLocForm({
      name: '',
      type: 'lab_sub',
      lab_id: user.role === 'lab_keeper' ? user.lab_id : '',
      description: ''
    });
    setLocOpened(true);
  };

  const openEditLoc = (loc) => {
    setEditingLoc(loc);
    setLocForm({
      name: loc.name,
      type: loc.type,
      lab_id: loc.lab_id,
      description: loc.description || ''
    });
    setLocOpened(true);
  };

  const saveLoc = async () => {
    setError('');
    setSavingLoc(true);
    try {
      const payload = {
        name: locForm.name,
        type: locForm.type,
        lab_id: parseInt(locForm.lab_id) || null,
        description: locForm.description
      };
      if (editingLoc) {
        await api.put(`/locations/${editingLoc.id}`, payload);
      } else {
        await api.post('/locations', payload);
      }
      showNotification({ color: 'green', title: 'Location saved' });
      setLocOpened(false);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.error || 'Location save failed';
      setError(msg);
    } finally {
      setSavingLoc(false);
    }
  };

  const deleteLoc = async (locId) => {
    if (!window.confirm('Delete this location?')) return;
    try {
      await api.delete(`/locations/${locId}`);
      showNotification({ color: 'orange', title: 'Location deleted' });
      fetchData();
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: err.response?.data?.error || 'Deletion failed' });
    }
  };

  const typeBadgeColor = (type) => (type === 'primary' ? 'blue' : 'gray');

  return (
    <>
      <Title order={2} mb="lg">Labs &amp; Locations</Title>

      {/* Labs section – admin only */}
      <Paper withBorder p="md" mb="xl">
        <Group position="apart" mb="sm">
          <Text weight={600}>Laboratories</Text>
          {hasRole('admin') && (
            <Button
              size="xs"
              leftSection={<IconPlus size={16} />}
              onClick={openAddLab}
              disabled={savingLab}
            >
              Add Lab
            </Button>
          )}
        </Group>

        {error && <Alert color="red" mb="sm">{error}</Alert>}

        <Table striped>
          <thead>
            <tr><th>Name</th><th>Description</th><th style={{ width: 120 }}>Actions</th></tr>
          </thead>
          <tbody>
            {labs.map((lab) => (
              <tr key={lab.id}>
                <td>{lab.name}</td>
                <td>{lab.description || '—'}</td>
                <td>
                  {hasRole('admin') && (
                    <Menu shadow="md" width={150}>
                      <Menu.Target>
                        <ActionIcon variant="default" size="sm">
                          <IconDots size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => openEditLab(lab)}>
                          Edit
                        </Menu.Item>
                        <Menu.Item leftSection={<IconTrash size={16} />} color="red" onClick={() => deleteLab(lab.id)}>
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>

      {/* Locations section – admin & keeper */}
      <Paper withBorder p="md">
        <Group position="apart" mb="sm">
          <Text weight={600}>Storage Locations</Text>
          {(hasRole('admin') || hasRole('lab_keeper')) && (
            <Button
              size="xs"
              leftSection={<IconPlus size={16} />}
              onClick={openAddLoc}
              disabled={savingLoc}
            >
              Add Location
            </Button>
          )}
        </Group>

        <Table striped>
          <thead>
            <tr><th>Name</th><th>Type</th><th>Lab</th><th style={{ width: 120 }}>Actions</th></tr>
          </thead>
          <tbody>
            {locations.map((loc) => {
              const lab = labs.find(l => l.id === loc.lab_id);
              return (
                <tr key={loc.id}>
                  <td>{loc.name}</td>
                  <td>
                    <Badge color={typeBadgeColor(loc.type)}>
                      {loc.type === 'primary' ? 'Primary Storage' : 'Sub-storage'}
                    </Badge>
                  </td>
                  <td>{lab ? lab.name : '—'}</td>
                  <td>
                    {(hasRole('admin') || hasRole('lab_keeper')) && (
                      <Menu shadow="md" width={150}>
                        <Menu.Target>
                          <ActionIcon variant="default" size="sm">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => openEditLoc(loc)}>
                            Edit
                          </Menu.Item>
                          <Menu.Item leftSection={<IconTrash size={16} />} color="red" onClick={() => deleteLoc(loc.id)}>
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Paper>

      {/* Lab Modal */}
      <Modal opened={labOpened} onClose={() => setLabOpened(false)} title={editingLab ? 'Edit Lab' : 'Add New Lab'}>
        <TextInput
          label="Name"
          value={labForm.name}
          onChange={e => setLabForm({ ...labForm, name: e.currentTarget.value })}
          required
        />
        <TextInput
          label="Description"
          mt="sm"
          value={labForm.description}
          onChange={e => setLabForm({ ...labForm, description: e.currentTarget.value })}
        />
        <Button fullWidth mt="xl" onClick={saveLab} loading={savingLab} disabled={savingLab}>
          {editingLab ? 'Update' : 'Create'}
        </Button>
      </Modal>

      {/* Location Modal */}
      <Modal opened={locOpened} onClose={() => setLocOpened(false)} title={editingLoc ? 'Edit Location' : 'Add New Location'}>
        <TextInput
          label="Name"
          value={locForm.name}
          onChange={e => setLocForm({ ...locForm, name: e.currentTarget.value })}
          required
        />
        <Select
          label="Type"
          mt="sm"
          data={[
            { value: 'primary', label: 'Primary Storage' },
            { value: 'lab_sub', label: 'Sub-storage' }
          ]}
          value={locForm.type}
          onChange={val => setLocForm({ ...locForm, type: val })}
        />
        {user.role === 'admin' && (
          <Select
            label="Lab"
            mt="sm"
            data={labs.map(l => ({ value: String(l.id), label: l.name }))}
            value={locForm.lab_id ? String(locForm.lab_id) : null}
            onChange={val => setLocForm({ ...locForm, lab_id: val })}
            required
          />
        )}
        {user.role === 'lab_keeper' && (
          <TextInput
            label="Lab"
            mt="sm"
            value={labs.find(l => l.id === user.lab_id)?.name || 'Your Lab'}
            disabled
          />
        )}
        <TextInput
          label="Description"
          mt="sm"
          value={locForm.description}
          onChange={e => setLocForm({ ...locForm, description: e.currentTarget.value })}
        />
        <Button fullWidth mt="xl" onClick={saveLoc} loading={savingLoc} disabled={savingLoc}>
          {editingLoc ? 'Update' : 'Create'}
        </Button>
      </Modal>
    </>
  );
}