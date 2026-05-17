// client/src/pages/UtilityList.jsx
import { useState, useEffect, useMemo } from 'react';
import {
  Title, Paper, Table, Button, Group, Badge, Modal, TextInput, Select,
  NumberInput, ActionIcon, Text, Alert, Grid, Menu, Checkbox, Accordion
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconDots } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CALIBRATION_INTERVALS = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '6 months' },
  { value: '365', label: '1 year' },
  { value: '730', label: '2 years' },
  { value: 'custom', label: 'Custom' },
];

const TYPES_WITH_ASSET_ID = ['equipment'];

export default function UtilityList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isLabKeeper = user?.role === 'lab_keeper';
  const labId = isLabKeeper ? user?.lab_id : null;

  const [allowedTypes, setAllowedTypes] = useState([]);
  const [typeFields, setTypeFields] = useState({});

  const [items, setItems] = useState([]);
  const [labs, setLabs] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLabId, setFilterLabId] = useState(isAdmin ? '' : labId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(getEmptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [hasExpiry, setHasExpiry] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      api.get('/labs').then(res => setLabs(res.data)).catch(console.error);
    }
    if (labId || filterLabId) {
      fetchLabConfig();
    }
  }, [labId, filterLabId]);

  useEffect(() => {
    fetchItems();
  }, [filterType, filterStatus, filterLabId, allowedTypes]);

  function getEmptyForm() {
    const activeLab = isAdmin ? filterLabId : labId;
    return {
      asset_id: '',
      name: '',
      type: allowedTypes[0] || '',
      lab_id: activeLab || '',
      total_count: 1,
      status: 'working',
      expiry_date: '',
      properties: {}
    };
  }

  async function fetchLabConfig() {
    try {
      const targetLab = isAdmin ? filterLabId : labId;
      if (!targetLab) return;
      const { data } = await api.get(`/labs/${targetLab}`);
      setAllowedTypes(data.allowed_utility_types || []);
      setTypeFields(data.type_fields || {});
    } catch (err) { console.error(err); }
  }

  async function fetchItems() {
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (isAdmin && filterLabId) params.lab_id = filterLabId;
      const res = await api.get('/utilities', { params });
      setItems(res.data);
    } catch (err) { console.error(err); }
  }

  const openAdd = () => {
    setEditingItem(null);
    setForm(getEmptyForm());
    setHasExpiry(false);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      asset_id: item.asset_id || '',
      name: item.name,
      type: item.type,
      lab_id: item.lab_id,
      total_count: item.total_count || 1,
      status: item.status,
      expiry_date: item.expiry_date || '',
      properties: item.properties || {}
    });
    setHasExpiry(!!item.expiry_date);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        type: form.type,
        lab_id: form.lab_id,
        total_count: form.total_count,
        status: form.status,
        expiry_date: hasExpiry ? (form.expiry_date || null) : null,
        properties: form.properties || {}
      };
      // Include asset_id only for equipment type
      if (TYPES_WITH_ASSET_ID.includes(form.type)) {
        payload.asset_id = form.asset_id || null;
        if (!payload.asset_id) {
          setError('Asset ID is required for equipment.');
          setSaving(false);
          return;
        }
      } else {
        payload.asset_id = null;
      }

      if (!payload.lab_id) {
        setError('Lab ID is missing.');
        setSaving(false);
        return;
      }

      if (editingItem) {
        await api.put(`/utilities/${editingItem.id}`, payload);
      } else {
        await api.post('/utilities', payload);
      }
      showNotification({ color: 'green', title: 'Item saved' });
      setModalOpen(false);
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    await api.delete(`/utilities/${id}`);
    fetchItems();
  };

  // Calibration handlers
  const handleCalibrationCheck = (checked) => {
    const newProps = { ...form.properties, needs_calibration: checked };
    if (!checked) {
      delete newProps.calibration_date;
      delete newProps.calibration_interval_days;
    }
    setForm({ ...form, properties: newProps });
  };

  const handleCalibrationIntervalChange = (val) => {
    if (val === 'custom') {
      setForm({
        ...form,
        properties: { ...form.properties, calibration_interval_days: '' }
      });
    } else {
      setForm({
        ...form,
        properties: { ...form.properties, calibration_interval_days: parseInt(val) }
      });
    }
  };

  const handleHasExpiryChange = (checked) => {
    setHasExpiry(checked);
    if (!checked) {
      setForm(prev => ({ ...prev, expiry_date: '' }));
    }
  };

  const visibleCustomFields = useMemo(() => {
    const all = typeFields[form.type] || [];
    if (form.type === 'instrument') {
      return all.filter(
        f => !['needs_calibration', 'calibration_date', 'calibration_interval_days'].includes(f.name)
      );
    }
    return all;
  }, [form.type, typeFields]);

  const groupedItems = useMemo(() => {
    const groups = {};
    items.forEach(item => {
      if (!groups[item.type]) groups[item.type] = [];
      groups[item.type].push(item);
    });
    return groups;
  }, [items]);

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Consumable Inventory</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openAdd} disabled={isAdmin && !filterLabId}>
          Add Item
        </Button>
      </Group>

      <Group mb="md">
        {isAdmin && (
          <Select
            placeholder="Filter by lab"
            data={labs.map(l => ({ value: String(l.id), label: l.name }))}
            value={filterLabId ? String(filterLabId) : null}
            onChange={val => setFilterLabId(val ? parseInt(val) : '')}
            clearable
          />
        )}
        <Select
          placeholder="Filter by type"
          data={allowedTypes.map(t => ({ value: t, label: t }))}
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
      </Group>

      {error && <Alert color="red" mb="md">{error}</Alert>}

      <Accordion defaultValue={allowedTypes[0]}>
        {allowedTypes.map(type => (
          <Accordion.Item key={type} value={type}>
            <Accordion.Control>
              <Group>
                <Text weight={500}>{type}</Text>
                <Badge>{(groupedItems[type] || []).length} items</Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Paper withBorder>
                <Table striped>
                  <thead>
                    <tr>
                      <th>Asset ID</th>
                      <th>Name</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Expiry</th>
                      {(typeFields[type] || []).map(f => (
                        <th key={f.name}>{f.label}</th>
                      ))}
                      <th style={{ width: 100 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(groupedItems[type] || []).map(item => (
                      <tr key={item.id}>
                        <td>{item.asset_id || '—'}</td>
                        <td>{item.name}</td>
                        <td>{item.total_count}</td>
                        <td>
                          <Badge color={item.status === 'working' ? 'green' : item.status === 'broken' ? 'red' : 'yellow'}>
                            {item.status}
                          </Badge>
                        </td>
                        <td>{item.expiry_date ? item.expiry_date.slice(0, 10) : '—'}</td>
                        {(typeFields[type] || []).map(f => (
                          <td key={f.name}>
                            {item.properties?.[f.name] !== undefined ? String(item.properties[f.name]) : '—'}
                          </td>
                        ))}
                        <td>
                          <Menu>
                            <Menu.Target><ActionIcon><IconDots size={16} /></ActionIcon></Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item icon={<IconEdit size={16} />} onClick={() => openEdit(item)}>Edit</Menu.Item>
                              <Menu.Item icon={<IconTrash size={16} />} color="red" onClick={() => handleDelete(item.id)}>Delete</Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Paper>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>

      {/* Add / Edit Modal */}
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Edit Item' : 'Add Consumable'} size="lg">
        <Grid>
          {/* Asset ID – only for equipment */}
          {TYPES_WITH_ASSET_ID.includes(form.type) && (
            <Grid.Col span={6}>
              <TextInput
                label="Asset ID"
                value={form.asset_id}
                onChange={e => setForm({ ...form, asset_id: e.currentTarget.value })}
                required
              />
            </Grid.Col>
          )}
          <Grid.Col span={6}>
            <TextInput label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.currentTarget.value })} required />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Type"
              data={allowedTypes.map(t => ({ value: t, label: t }))}
              value={form.type}
              onChange={val => setForm({ ...form, type: val, properties: {} })}
            />
          </Grid.Col>
          <Grid.Col span={3}>
            <NumberInput label="Quantity" min={1} value={form.total_count} onChange={val => setForm({ ...form, total_count: val || 1 })} />
          </Grid.Col>
          <Grid.Col span={3}>
            <Select
              label="Status"
              data={['working', 'broken', 'under_repair']}
              value={form.status}
              onChange={val => setForm({ ...form, status: val })}
            />
          </Grid.Col>

          {/* Expiry checkbox + date input */}
          <Grid.Col span={12}>
            <Checkbox
              label="Has Expiry Date"
              checked={hasExpiry}
              onChange={(e) => handleHasExpiryChange(e.currentTarget.checked)}
            />
          </Grid.Col>
          {hasExpiry && (
            <Grid.Col span={6}>
              <TextInput
                label="Expiry Date"
                type="date"
                value={form.expiry_date || ''}
                onChange={e => setForm({ ...form, expiry_date: e.currentTarget.value })}
                placeholder="YYYY-MM-DD"
              />
            </Grid.Col>
          )}

          {/* Calibration section – only for instrument type */}
          {form.type === 'instrument' && (
            <>
              <Grid.Col span={12}>
                <Checkbox
                  label="Requires Calibration"
                  checked={!!form.properties.needs_calibration}
                  onChange={(e) => handleCalibrationCheck(e.currentTarget.checked)}
                />
              </Grid.Col>
              {form.properties.needs_calibration && (
                <>
                  <Grid.Col span={6}>
                    <Select
                      label="Calibration Interval"
                      data={CALIBRATION_INTERVALS}
                      value={
                        form.properties.calibration_interval_days
                          ? String(form.properties.calibration_interval_days)
                          : 'custom'
                      }
                      onChange={handleCalibrationIntervalChange}
                    />
                    {(!CALIBRATION_INTERVALS.map(i => i.value).includes(
                      String(form.properties.calibration_interval_days || '')
                    )) && (
                      <NumberInput
                        mt="xs"
                        placeholder="Custom days"
                        value={form.properties.calibration_interval_days || ''}
                        onChange={val => setForm({
                          ...form,
                          properties: { ...form.properties, calibration_interval_days: val }
                        })}
                      />
                    )}
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TextInput
                      label="Last Calibration Date"
                      type="date"
                      value={form.properties.calibration_date || ''}
                      onChange={e => setForm({
                        ...form,
                        properties: { ...form.properties, calibration_date: e.currentTarget.value }
                      })}
                      placeholder="YYYY-MM-DD"
                    />
                  </Grid.Col>
                </>
              )}
            </>
          )}

          {/* Dynamic custom fields */}
          {visibleCustomFields.map(field => (
            <Grid.Col key={field.name} span={6}>
              {field.type === 'text' && (
                <TextInput
                  label={field.label}
                  value={form.properties[field.name] || ''}
                  onChange={e => setForm({ ...form, properties: { ...form.properties, [field.name]: e.currentTarget.value } })}
                />
              )}
              {field.type === 'number' && (
                <NumberInput
                  label={field.label}
                  value={form.properties[field.name] ?? ''}
                  onChange={val => setForm({ ...form, properties: { ...form.properties, [field.name]: val } })}
                />
              )}
              {field.type === 'date' && (
                <TextInput
                  label={field.label}
                  type="date"
                  value={form.properties[field.name] || ''}
                  onChange={e => setForm({ ...form, properties: { ...form.properties, [field.name]: e.currentTarget.value } })}
                  placeholder="YYYY-MM-DD"
                />
              )}
              {field.type === 'boolean' && (
                <Checkbox
                  label={field.label}
                  checked={!!form.properties[field.name]}
                  onChange={e => setForm({ ...form, properties: { ...form.properties, [field.name]: e.currentTarget.checked } })}
                />
              )}
            </Grid.Col>
          ))}
        </Grid>
        <Button fullWidth mt="xl" loading={saving} onClick={handleSave}>
          {editingItem ? 'Update' : 'Create'}
        </Button>
      </Modal>
    </>
  );
}