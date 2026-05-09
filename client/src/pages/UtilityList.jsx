import { useState, useEffect } from 'react';
import {
  Title, Paper, Table, Button, Group, Badge, Modal, TextInput, Select,
  NumberInput, ActionIcon, Text, Alert, Grid, Tooltip
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconTool } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const UTILITY_TYPES = [
  'glassware', 'plasticware', 'equipment', 'instrument',
  'standard', 'consumable_sanitation', 'ppe', 'utensil'
];

// Configuration of extra fields per type
const TYPE_PROPERTIES = {
  glassware: [
    { key: 'material', label: 'Material', type: 'text' },
    { key: 'volume_ml', label: 'Volume (ml)', type: 'number' },
  ],
  instrument: [
    { key: 'model', label: 'Model', type: 'text' },
    { key: 'calibration_date', label: 'Calibration Date', type: 'date' },
  ],
  standard: [
    { key: 'iso_number', label: 'ISO Number', type: 'text' },
    { key: 'expiry_date', label: 'Expiry Date', type: 'date' },
  ],
  ppe: [
    { key: 'size', label: 'Size', type: 'text' },
    { key: 'material', label: 'Material', type: 'text' },
  ],
  equipment: [
    { key: 'serial', label: 'Serial Number', type: 'text' },
    { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
  ],
  // Add more as needed, default empty for others
};

function getTypeProperties(type) {
  return TYPE_PROPERTIES[type] || [];
}

export default function UtilityList() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    name: '', type: 'equipment', location_id: null, total_count: 1,
    status: 'working', org_serial: '', properties: {}
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = async () => {
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/utilities', { params });
      setItems(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await api.get('/locations');
      setLocations(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchItems(); fetchLocations(); }, [filterType, filterStatus]);

  const openAdd = () => {
    setEditingItem(null);
    setForm({
      name: '', type: 'equipment', location_id: null, total_count: 1,
      status: 'working', org_serial: '', properties: {}
    });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      type: item.type,
      location_id: item.location_id,
      total_count: item.total_count,
      status: item.status,
      org_serial: item.org_serial || '',
      properties: item.properties || {}
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.org_serial === '') payload.org_serial = null;
      if (editingItem) {
        await api.put(`/utilities/${editingItem.id}`, payload);
      } else {
        await api.post('/utilities', payload);
      }
      showNotification({ color: 'green', title: 'Item saved' });
      setModalOpen(false);
      fetchItems();
    } catch (err) {
      const msg = err.response?.data?.error || 'Save failed';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await api.delete(`/utilities/${id}`);
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  // Update a property in the form
  const updateProperty = (key, value) => {
    setForm({ ...form, properties: { ...form.properties, [key]: value } });
  };

  const extraFields = getTypeProperties(form.type);

  return (
    <>
      <Title order={2} mb="lg">Utility Items</Title>
      <Group mb="md">
        <Select
          placeholder="Filter by type"
          data={UTILITY_TYPES.map(t => ({ value: t, label: t.replace('_', ' ') }))}
          value={filterType}
          onChange={setFilterType}
          clearable
        />
        <Select
          placeholder="Filter by status"
          data={['working', 'broken', 'under_repair']}
          value={filterStatus}
          onChange={setFilterStatus}
          clearable
        />
        <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>Add Utility</Button>
      </Group>

      <Paper withBorder>
        <Table striped>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Location</th>
              <th>Asset ID</th>
              <th style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td><Badge>{item.type}</Badge></td>
                <td>
                  <Badge color={item.status === 'working' ? 'green' : item.status === 'broken' ? 'red' : 'yellow'}>
                    {item.status}
                  </Badge>
                </td>
                <td>{locations.find(l => l.id === item.location_id)?.name || '—'}</td>
                <td>{item.asset_id || '—'}</td>
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

      {/* Add/Edit Modal */}
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Edit Utility Item' : 'Add Utility Item'} size="lg">
        {error && <Alert color="red" mb="sm">{error}</Alert>}
        <Grid>
          <Grid.Col span={6}>
            <TextInput label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.currentTarget.value })} required />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Type"
              data={UTILITY_TYPES.map(t => ({ value: t, label: t.replace('_', ' ') }))}
              value={form.type}
              onChange={(val) => setForm({ ...form, type: val, properties: {} })}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Location"
              placeholder="Storage location"
              data={locations.map(l => ({ value: l.id.toString(), label: l.name }))}
              value={form.location_id?.toString()}
              onChange={(val) => setForm({ ...form, location_id: val ? parseInt(val) : null })}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={3}>
            <NumberInput label="Count" min={1} value={form.total_count} onChange={(val) => setForm({ ...form, total_count: val || 1 })} />
          </Grid.Col>
          <Grid.Col span={3}>
            <Select
              label="Status"
              data={['working', 'broken', 'under_repair']}
              value={form.status}
              onChange={(val) => setForm({ ...form, status: val })}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <TextInput label="Original Serial" value={form.org_serial} onChange={e => setForm({ ...form, org_serial: e.currentTarget.value })} />
          </Grid.Col>

          {/* Dynamic extra fields */}
          {extraFields.map(field => (
            <Grid.Col key={field.key} span={6}>
              {field.type === 'number' ? (
                <NumberInput
                  label={field.label}
                  value={form.properties[field.key] || ''}
                  onChange={(val) => updateProperty(field.key, val)}
                  precision={0}
                />
              ) : field.type === 'date' ? (
                <TextInput
                  label={field.label}
                  type="date"
                  value={form.properties[field.key] || ''}
                  onChange={(e) => updateProperty(field.key, e.currentTarget.value)}
                />
              ) : (
                <TextInput
                  label={field.label}
                  value={form.properties[field.key] || ''}
                  onChange={(e) => updateProperty(field.key, e.currentTarget.value)}
                />
              )}
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