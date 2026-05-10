import { useState, useEffect } from 'react';
import {
  Title, Paper, Table, Button, Group, Badge, Modal, TextInput, Select,
  NumberInput, ActionIcon, Text, Alert, Grid
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const UTILITY_TYPES = [
  'glassware', 'plasticware', 'equipment', 'instrument',
  'standard', 'consumable_sanitation', 'ppe', 'utensil'
];

const TYPE_PROPERTIES = {
  glassware: [
    { key: 'material', label: 'Material' },
    { key: 'volume_ml', label: 'Volume (ml)' },
  ],
  instrument: [
    { key: 'model', label: 'Model' },
    { key: 'calibration_date', label: 'Calibration Date' },
  ],
  standard: [
    { key: 'iso_number', label: 'ISO Number' },
    { key: 'expiry_date', label: 'Expiry Date' },
  ],
  ppe: [
    { key: 'size', label: 'Size' },
    { key: 'material', label: 'Material' },
  ],
  equipment: [
    { key: 'serial', label: 'Serial Number' },
    { key: 'manufacturer', label: 'Manufacturer' },
  ],
};

// Types that need a unique asset ID
const TYPES_WITH_ASSET_ID = ['equipment', 'instrument'];

function getTypeProperties(type) {
  return TYPE_PROPERTIES[type] || [];
}

export default function UtilityList() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [labs, setLabs] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    asset_id: '', name: '', type: 'equipment', location_id: null,
    lab_id: user.role === 'lab_keeper' ? user.lab_id : '',
    total_count: 1, status: 'working', properties: {}
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchItems();
    fetchLocations();
    if (user.role === 'admin') fetchLabs();
  }, [filterType, filterStatus]);

  const fetchItems = async () => {
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/utilities', { params });
      setItems(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchLocations = async () => {
    try {
      const res = await api.get('/locations');
      setLocations(res.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchLabs = async () => {
    try {
      const res = await api.get('/labs');
      setLabs(res.data);
    } catch (err) { console.error(err); }
  };

  const openAdd = () => {
    setEditingItem(null);
    setForm({
      asset_id: '', name: '', type: 'equipment', location_id: null,
      lab_id: user.role === 'lab_keeper' ? user.lab_id : '',
      total_count: 1, status: 'working', properties: {}
    });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      asset_id: item.asset_id || '',
      name: item.name,
      type: item.type,
      location_id: item.location_id || null,
      lab_id: item.lab_id,
      total_count: item.total_count || 1,
      status: item.status,
      properties: item.properties || {}
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // If type doesn't need asset_id, set it to null
      const payload = { ...form };
      if (!TYPES_WITH_ASSET_ID.includes(payload.type)) {
        payload.asset_id = null;
      } else if (!payload.asset_id) {
        setError('Asset ID is required for this type.');
        setSaving(false);
        return;
      }

      if (editingItem) {
        await api.put(`/utilities/${editingItem.id}`, payload);
      } else {
        await api.post('/utilities', payload);
      }
      showNotification({ color: 'green', title: 'Utility saved' });
      setModalOpen(false);
      fetchItems();
    } catch (err) {
      const msg = err.response?.data?.error || 'Save failed';
      setError(msg);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this utility?')) return;
    await api.delete(`/utilities/${id}`);
    fetchItems();
  };

  const extraFields = getTypeProperties(form.type);

  return (
    <>
      <Title order={2} mb="lg">Utilities</Title>
      <Group mb="md">
        <Select
          placeholder="Filter by type"
          data={UTILITY_TYPES.map(t => ({ value: t, label: t.replace('_',' ') }))}
          value={filterType}
          onChange={setFilterType}
          clearable
        />
        <Select
          placeholder="Filter by status"
          data={['working','broken','under_repair']}
          value={filterStatus}
          onChange={setFilterStatus}
          clearable
        />
        <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>Add Utility</Button>
      </Group>

      {error && <Alert color="red" mb="md">{error}</Alert>}

      <Paper withBorder>
        <Table striped>
          <thead>
            <tr>
              <th>Asset ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Lab</th>
              <th>Location</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>{item.asset_id || '—'}</td>
                <td>{item.name}</td>
                <td><Badge>{item.type}</Badge></td>
                <td>
                  <Badge color={item.status === 'working' ? 'green' : item.status === 'broken' ? 'red' : 'yellow'}>
                    {item.status}
                  </Badge>
                </td>
                <td>{item.lab_name || '—'}</td>
                <td>{item.location_name || '—'}</td>
                <td>
                  <Group gap="xs">
                    <ActionIcon color="blue" onClick={() => openEdit(item)}><IconEdit size={16} /></ActionIcon>
                    <ActionIcon color="red" onClick={() => handleDelete(item.id)}><IconTrash size={16} /></ActionIcon>
                  </Group>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Edit Utility' : 'Add Utility'} size="lg">
        <Grid>
          {/* Asset ID – only shown for types that need it */}
          {TYPES_WITH_ASSET_ID.includes(form.type) && (
            <Grid.Col span={6}>
              <TextInput label="Asset ID" value={form.asset_id} onChange={e => setForm({...form, asset_id: e.target.value})} required />
            </Grid.Col>
          )}
          <Grid.Col span={6}>
            <TextInput label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Type"
              data={UTILITY_TYPES.map(t => ({ value: t, label: t.replace('_',' ') }))}
              value={form.type}
              onChange={val => setForm({...form, type: val, properties: {}})}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Status"
              data={['working','broken','under_repair']}
              value={form.status}
              onChange={val => setForm({...form, status: val})}
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
          {user.role === 'lab_keeper' && (
            <Grid.Col span={6}>
              <TextInput
                label="Lab"
                value={labs.find(l => l.id === user.lab_id)?.name || 'Your Lab'}
                disabled
              />
            </Grid.Col>
          )}
          <Grid.Col span={6}>
            <Select
              label="Location (optional)"
              data={locations.map(l => ({ value: l.id.toString(), label: l.name }))}
              value={form.location_id?.toString()}
              onChange={val => setForm({...form, location_id: val ? parseInt(val) : null})}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={3}>
            <NumberInput label="Count" min={1} value={form.total_count} onChange={val => setForm({...form, total_count: val || 1})} />
          </Grid.Col>
          {extraFields.map(field => (
            <Grid.Col key={field.key} span={6}>
              <TextInput
                label={field.label}
                value={form.properties[field.key] || ''}
                onChange={e => setForm({...form, properties: {...form.properties, [field.key]: e.target.value}})}
              />
            </Grid.Col>
          ))}
        </Grid>
        <Button fullWidth mt="xl" loading={saving} disabled={saving || !form.name} onClick={handleSave}>
          {editingItem ? 'Update' : 'Create'}
        </Button>
      </Modal>
    </>
  );
}