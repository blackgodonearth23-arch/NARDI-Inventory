// client/src/pages/LabsManagement.jsx
import { useState, useEffect } from 'react';
import {
  Title, Table, Button, Group, Badge, Modal, TextInput, Select,
  ActionIcon, Text, Alert, Paper, Stack, Menu, Checkbox, Divider,
  Box
} from '@mantine/core';
import {
  IconPlus, IconTrash, IconEdit, IconSettings, IconDots
} from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const PREDEFINED_UTILITY_TYPES = [
  'glassware', 'plasticware', 'equipment', 'instrument',
  'standard', 'consumable_sanitation', 'ppe', 'utensil',
  'supplements', 'media'
];

export default function LabsManagement() {
  const { hasRole, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isLabKeeper = user?.role === 'lab_keeper';
  const keeperLabId = user?.lab_id;

  const [labs, setLabs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');

  // ---- Lab form state (admin only) ----
  const [labOpened, setLabOpened] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [labForm, setLabForm] = useState({
    name: '',
    description: '',
    type: 'Other',
    allowed_utility_types: PREDEFINED_UTILITY_TYPES
  });
  const [savingLab, setSavingLab] = useState(false);

  // ---- Location form state ----
  const [locOpened, setLocOpened] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);
  const [locForm, setLocForm] = useState({ name: '', type: 'lab_sub', lab_id: keeperLabId || '', description: '' });
  const [savingLoc, setSavingLoc] = useState(false);

  // ---- Utility configuration modal state ----
  const [configOpened, setConfigOpened] = useState(false);
  const [configLab, setConfigLab] = useState(null);
  const [configTypes, setConfigTypes] = useState([]);
  const [configTypeFields, setConfigTypeFields] = useState({});
  const [savingConfig, setSavingConfig] = useState(false);

  // ---- Data fetching ----
  const fetchData = async () => {
    try {
      const fetchers = [];
      // Admin needs all labs, keeper doesn't need labs list
      if (isAdmin) {
        fetchers.push(api.get('/labs').then(res => setLabs(res.data)));
      } else {
        setLabs([]); // clear labs for non-admin
      }

      // Fetch locations – for keeper, filter to own lab
      if (isLabKeeper && keeperLabId) {
        // Backend filter: /locations?lab_id=X
        fetchers.push(
          api.get('/locations', { params: { lab_id: keeperLabId } })
            .then(res => setLocations(res.data))
            .catch(() => {
              // Fallback: fetch all and filter locally
              api.get('/locations').then(res => {
                setLocations((res.data || []).filter(l => l.lab_id === keeperLabId));
              });
            })
        );
      } else {
        fetchers.push(api.get('/locations').then(res => setLocations(res.data)));
      }

      await Promise.all(fetchers);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  // ========================
  //        LAB ACTIONS
  // ========================
  const openAddLab = () => {
    setEditingLab(null);
    setLabForm({ name: '', description: '', type: 'Other', allowed_utility_types: PREDEFINED_UTILITY_TYPES });
    setLabOpened(true);
  };

  const openEditLab = (lab) => {
    setEditingLab(lab);
    setLabForm({
      name: lab.name,
      description: lab.description || '',
      type: lab.type || 'Other',
      allowed_utility_types: lab.allowed_utility_types || PREDEFINED_UTILITY_TYPES
    });
    setLabOpened(true);
  };

  const saveLab = async () => {
    setError('');
    setSavingLab(true);
    try {
      const payload = {
        name: labForm.name,
        description: labForm.description,
        type: labForm.type,
        allowed_utility_types: labForm.type !== 'ICT' ? labForm.allowed_utility_types : undefined
      };
      if (editingLab) {
        await api.put(`/labs/${editingLab.id}`, payload);
      } else {
        await api.post('/labs', payload);
      }
      showNotification({ color: 'green', title: 'Lab saved' });
      setLabOpened(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Lab save failed');
    } finally { setSavingLab(false); }
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

  // ========================
  //     LOCATION ACTIONS
  // ========================
  const openAddLoc = () => {
    setEditingLoc(null);
    setLocForm({
      name: '',
      type: 'lab_sub',
      lab_id: isLabKeeper ? keeperLabId : '',
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
      setError(err.response?.data?.error || 'Location save failed');
    } finally { setSavingLoc(false); }
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

  // ===============================
  //  UTILITY CONFIGURATION ACTIONS
  // ===============================
  const openUtilityConfig = (lab) => {
    setConfigLab(lab);
    setConfigTypes(lab.allowed_utility_types || []);
    setConfigTypeFields(lab.type_fields || {});
    setConfigOpened(true);
  };

  const addType = () => {
    const newType = prompt('Enter new type name:');
    if (newType && !configTypes.includes(newType)) {
      setConfigTypes([...configTypes, newType]);
      setConfigTypeFields({ ...configTypeFields, [newType]: [] });
    }
  };

  const removeType = (type) => {
    setConfigTypes(configTypes.filter(t => t !== type));
    const newFields = { ...configTypeFields };
    delete newFields[type];
    setConfigTypeFields(newFields);
  };

  const addField = (type) => {
    let name = prompt('Field name (key):');
    if (!name) return;
    if (name === 'expiry_date') {
      alert('"expiry_date" is a default field and cannot be used as a custom field.');
      return;
    }
    const label = prompt('Field label:') || name;
    const fieldType = prompt('Data type (text, number, date, boolean):', 'text');
    if (!['text', 'number', 'date', 'boolean'].includes(fieldType)) return;
    const newField = { name, label, type: fieldType };
    setConfigTypeFields({
      ...configTypeFields,
      [type]: [...(configTypeFields[type] || []), newField]
    });
  };

  const removeField = (type, fieldName) => {
    setConfigTypeFields({
      ...configTypeFields,
      [type]: configTypeFields[type].filter(f => f.name !== fieldName)
    });
  };

  const saveUtilityConfig = async () => {
    setSavingConfig(true);
    try {
      await api.put(`/labs/${configLab.id}/utility-config`, {
        allowed_utility_types: configTypes,
        type_fields: configTypeFields
      });
      showNotification({ color: 'green', title: 'Configuration saved' });
      setConfigOpened(false);
      fetchData();
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: err.response?.data?.error || 'Save failed' });
    } finally { setSavingConfig(false); }
  };

  // ========================
  //       RENDER
  // ========================
  const typeBadgeColor = (type) => (type === 'primary' ? 'blue' : 'gray');
  const labTypeColor = (type) => {
    switch (type) {
      case 'ICT': return 'blue';
      case 'Chemistry': return 'green';
      case 'Other': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <>
      <Title order={2} mb="lg">{isAdmin ? 'Labs & Locations' : 'Storage Locations'}</Title>

      {/* Labs section – admin only */}
      {isAdmin && (
        <Paper withBorder p="md" mb="xl">
          <Group position="apart" mb="sm">
            <Text weight={600}>Laboratories</Text>
            <Button size="xs" leftSection={<IconPlus size={16} />} onClick={openAddLab} disabled={savingLab}>
              Add Lab
            </Button>
          </Group>

          {error && <Alert color="red" mb="sm">{error}</Alert>}

          <Table striped>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Description</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {labs.map((lab) => (
                <tr key={lab.id}>
                  <td>{lab.name}</td>
                  <td><Badge color={labTypeColor(lab.type)}>{lab.type || 'Other'}</Badge></td>
                  <td>{lab.description || '—'}</td>
                  <td>
                    <Menu shadow="md" width={180}>
                      <Menu.Target>
                        <ActionIcon variant="default" size="sm">
                          <IconDots size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => openEditLab(lab)}>
                          Edit
                        </Menu.Item>
                        {lab.type !== 'ICT' && (
                          <Menu.Item leftSection={<IconSettings size={16} />} onClick={() => openUtilityConfig(lab)}>
                            Configure Utilities
                          </Menu.Item>
                        )}
                        <Menu.Divider />
                        <Menu.Item leftSection={<IconTrash size={16} />} color="red" onClick={() => deleteLab(lab.id)}>
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Paper>
      )}

      {/* Locations section – admin & keeper */}
      <Paper withBorder p="md">
        <Group position="apart" mb="sm">
          <Text weight={600}>Storage Locations</Text>
          <Button size="xs" leftSection={<IconPlus size={16} />} onClick={openAddLoc} disabled={savingLoc}>
            Add Location
          </Button>
        </Group>

        <Table striped>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              {isAdmin && <th>Lab</th>}
              <th style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((loc) => {
              const lab = labs.find(l => l.id === loc.lab_id);
              return (
                <tr key={loc.id}>
                  <td>{loc.name}</td>
                  <td><Badge color={typeBadgeColor(loc.type)}>{loc.type === 'primary' ? 'Primary Storage' : 'Sub-storage'}</Badge></td>
                  {isAdmin && <td>{lab ? lab.name : '—'}</td>}
                  <td>
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Paper>

      {/* ===== LAB MODAL (admin only) ===== */}
      {isAdmin && (
        <Modal opened={labOpened} onClose={() => setLabOpened(false)} title={editingLab ? 'Edit Lab' : 'Add New Lab'}>
          <Stack>
            <TextInput label="Name" value={labForm.name} onChange={e => setLabForm({ ...labForm, name: e.currentTarget.value })} required />
            <TextInput label="Description" value={labForm.description} onChange={e => setLabForm({ ...labForm, description: e.currentTarget.value })} />
            <Select
              label="Lab Type"
              data={['ICT', 'Chemistry', 'Other']}
              value={labForm.type}
              onChange={val => setLabForm({ ...labForm, type: val })}
              required
            />
            {labForm.type !== 'ICT' && (
              <>
                <Text size="sm" weight={500}>Allowed Utility Types</Text>
                <Group spacing="xs">
                  {PREDEFINED_UTILITY_TYPES.map(type => (
                    <Checkbox
                      key={type}
                      label={type.replace(/_/g, ' ')}
                      checked={labForm.allowed_utility_types.includes(type)}
                      onChange={() => {
                        const arr = labForm.allowed_utility_types;
                        setLabForm({
                          ...labForm,
                          allowed_utility_types: arr.includes(type) ? arr.filter(t => t !== type) : [...arr, type]
                        });
                      }}
                    />
                  ))}
                </Group>
              </>
            )}
          </Stack>
          <Button fullWidth mt="xl" onClick={saveLab} loading={savingLab} disabled={savingLab}>
            {editingLab ? 'Update' : 'Create'}
          </Button>
        </Modal>
      )}

      {/* ===== LOCATION MODAL ===== */}
      <Modal opened={locOpened} onClose={() => setLocOpened(false)} title={editingLoc ? 'Edit Location' : 'Add New Location'}>
        <TextInput label="Name" value={locForm.name} onChange={e => setLocForm({ ...locForm, name: e.currentTarget.value })} required />
        <Select
          label="Type"
          mt="sm"
          data={[{ value: 'primary', label: 'Primary Storage' }, { value: 'lab_sub', label: 'Sub-storage' }]}
          value={locForm.type}
          onChange={val => setLocForm({ ...locForm, type: val })}
        />
        {isAdmin && (
          <Select
            label="Lab"
            mt="sm"
            data={labs.map(l => ({ value: String(l.id), label: l.name }))}
            value={locForm.lab_id ? String(locForm.lab_id) : null}
            onChange={val => setLocForm({ ...locForm, lab_id: val })}
            required
          />
        )}
        {isLabKeeper && (
          <TextInput
            label="Lab"
            mt="sm"
            value={labs.find(l => l.id === keeperLabId)?.name || 'Your Lab'}
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

      {/* ===== UTILITY CONFIGURATION MODAL (admin only, already inside admin section) ===== */}
      {isAdmin && (
        <Modal
          opened={configOpened}
          onClose={() => setConfigOpened(false)}
          title={`Utility Configuration – ${configLab?.name}`}
          size="xl"
        >
          <Group mb="md">
            <Button size="xs" leftSection={<IconPlus size={16} />} onClick={addType}>Add Type</Button>
          </Group>
          <Divider mb="sm" />
          {configTypes.map(type => (
            <Box key={type} mb="lg">
              <Group position="apart" mb="xs">
                <Text weight={500}>{type}</Text>
                <Button size="xs" color="red" variant="subtle" onClick={() => removeType(type)}>Remove Type</Button>
              </Group>
              <Table>
                <thead>
                  <tr>
                    <th>Field Name</th>
                    <th>Label</th>
                    <th>Type</th>
                    <th style={{ width: 80 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(configTypeFields[type] || []).map(field => (
                    <tr key={field.name}>
                      <td>{field.name}</td>
                      <td>{field.label}</td>
                      <td><Badge>{field.type}</Badge></td>
                      <td>
                        <ActionIcon color="red" size="sm" onClick={() => removeField(type, field.name)}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Button size="xs" mt="xs" variant="outline" onClick={() => addField(type)}>Add Field</Button>
            </Box>
          ))}
          <Button fullWidth mt="xl" loading={savingConfig} onClick={saveUtilityConfig}>
            Save Configuration
          </Button>
        </Modal>
      )}
    </>
  );
}