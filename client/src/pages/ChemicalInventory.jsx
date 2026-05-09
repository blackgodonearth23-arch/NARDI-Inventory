import { useState, useEffect } from 'react';
import {
  Title, Paper, Table, Button, Group, Badge, Modal, TextInput, Select,
  NumberInput, ActionIcon, Text, Alert, Grid
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconPackage } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CHEMICAL_TYPES = ['Solution', 'Solvent', 'Salt', 'Acid', 'Base', 'Indicator', 'Buffer', 'Standard', 'Other'];
const CONTAINER_TYPES = ['glass_bottle', 'plastic_bottle', 'metal_canister', 'other'];
const UNITS = ['ml', 'l', 'g', 'kg', 'bottle', 'other'];

export default function ChemicalInventory() {
  const { user } = useAuth();
  const [chemicals, setChemicals] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filterType, setFilterType] = useState(null);

  // Chemical form
  const [chemModalOpen, setChemModalOpen] = useState(false);
  const [editingChem, setEditingChem] = useState(null);
  const [chemForm, setChemForm] = useState({
    name: '', cas_number: '', reorder_threshold: 1,
    chemical_type: 'Other', chemical_type_custom: ''
  });
  const [savingChem, setSavingChem] = useState(false);

  // Container management
  const [selectedChem, setSelectedChem] = useState(null);
  const [containers, setContainers] = useState([]);
  const [containerModalOpen, setContainerModalOpen] = useState(false);
  const [addContainerOpen, setAddContainerOpen] = useState(false);
  const [containerForm, setContainerForm] = useState({
    quantity: 1, location_id: null,
    container_type: 'glass_bottle', container_type_custom: '',
    container_size: '', container_unit: 'ml'
  });
  const [addingContainers, setAddingContainers] = useState(false);

  const [openPin, setOpenPin] = useState('');
  const [openingContainer, setOpeningContainer] = useState(false);

  useEffect(() => { fetchChemicals(); }, [filterType]);
  useEffect(() => { fetchLocations(); }, []);

  const fetchChemicals = async () => {
    try {
      const res = await api.get('/chemicals');
      let data = res.data;
      if (filterType) data = data.filter(c => c.chemical_type === filterType);
      setChemicals(data);
    } catch (err) { console.error(err); }
  };

  const fetchLocations = async () => {
    try {
      const res = await api.get('/locations');
      setLocations(res.data || []);
    } catch (err) { console.error(err); }
  };

  const openAddChem = () => {
    setEditingChem(null);
    setChemForm({ name: '', cas_number: '', reorder_threshold: 1, chemical_type: 'Other', chemical_type_custom: '' });
    setChemModalOpen(true);
  };

  const openEditChem = (chem) => {
    setEditingChem(chem);
    const isPre = CHEMICAL_TYPES.includes(chem.chemical_type);
    setChemForm({
      name: chem.name,
      cas_number: chem.cas_number || '',
      reorder_threshold: chem.reorder_threshold || 1,
      chemical_type: isPre ? chem.chemical_type : 'Other',
      chemical_type_custom: isPre ? '' : (chem.chemical_type || '')
    });
    setChemModalOpen(true);
  };

  const saveChem = async () => {
    setSavingChem(true);
    try {
      const payload = {
        name: chemForm.name,
        cas_number: chemForm.cas_number || null,
        reorder_threshold: chemForm.reorder_threshold,
        chemical_type: chemForm.chemical_type === 'Other' ? chemForm.chemical_type_custom : chemForm.chemical_type,
      };
      if (editingChem) {
        await api.put(`/chemicals/${editingChem.id}`, payload);
      } else {
        await api.post('/chemicals', payload);
      }
      showNotification({ color: 'green', title: editingChem ? 'Updated' : 'Created' });
      setChemModalOpen(false);
      fetchChemicals();
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: err.response?.data?.error });
    } finally { setSavingChem(false); }
  };

  const deleteChem = async (id) => {
    if (!window.confirm('Archive this chemical?')) return;
    await api.delete(`/chemicals/${id}`);
    fetchChemicals();
  };

  const loadContainers = async (chemicalId) => {
    try {
      const res = await api.get(`/chemicals/${chemicalId}/containers`);
      setContainers(res.data);
      setSelectedChem(chemicalId);
      setContainerModalOpen(true);
    } catch (err) { console.error(err); }
  };

  const addContainers = async () => {
    if (!containerForm.location_id) return;
    setAddingContainers(true);
    try {
      const containerType = containerForm.container_type === 'other'
        ? containerForm.container_type_custom
        : containerForm.container_type;
      await api.post(`/chemicals/${selectedChem}/containers`, {
        quantity: containerForm.quantity,
        location_id: containerForm.location_id,
        container_type: containerType,
        container_size: containerForm.container_size ? parseFloat(containerForm.container_size) : null,
        container_unit: containerForm.container_unit || 'ml'
      });
      showNotification({ color: 'green', title: `${containerForm.quantity} container(s) added` });
      setAddContainerOpen(false);
      loadContainers(selectedChem);
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: err.response?.data?.error });
    } finally { setAddingContainers(false); }
  };

  const openContainerByPin = async () => {
    if (!openPin || openPin.length !== 5) return;
    setOpeningContainer(true);
    try {
      await api.post(`/chemicals/${selectedChem}/open`, { pin_5: openPin });
      showNotification({ color: 'green', title: 'Container opened' });
      setOpenPin('');
      loadContainers(selectedChem);
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: err.response?.data?.error });
    } finally { setOpeningContainer(false); }
  };

  const statusColor = (status) =>
    status === 'In Stock' ? 'green' : status === 'Low' ? 'yellow' : 'red';

  return (
    <>
      <Title order={2} mb="lg">Chemical Inventory</Title>

      <Group mb="md">
        <Button leftSection={<IconPlus size={16} />} onClick={openAddChem}>Add Chemical</Button>
        <Select
          placeholder="Filter by type"
          data={CHEMICAL_TYPES.filter(t => t !== 'Other')}
          value={filterType}
          onChange={setFilterType}
          clearable
        />
      </Group>

      <Paper withBorder mb="xl">
        <Table striped>
          <thead>
            <tr>
              <th>Name</th><th>CAS</th><th>Type</th><th>Threshold</th><th>Status</th><th>Stock (primary/sub)</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {chemicals.map(chem => (
              <tr key={chem.id}>
                <td>{chem.name}</td>
                <td>{chem.cas_number || '—'}</td>
                <td><Badge variant="light">{chem.chemical_type || 'Other'}</Badge></td>
                <td>{chem.reorder_threshold}</td>
                <td><Badge color={statusColor(chem.stock_status)}>{chem.stock_status}</Badge></td>
                <td>{chem.stock_display || '0 / 0'}</td>
                <td>
                  <Group gap="xs">
                    <ActionIcon color="blue" onClick={() => openEditChem(chem)}><IconEdit size={16} /></ActionIcon>
                    <ActionIcon color="gray" onClick={() => loadContainers(chem.id)}><IconPackage size={16} /></ActionIcon>
                    <ActionIcon color="red" onClick={() => deleteChem(chem.id)}><IconTrash size={16} /></ActionIcon>
                  </Group>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>

      {/* Chemical Modal */}
      <Modal opened={chemModalOpen} onClose={() => setChemModalOpen(false)} title={editingChem ? 'Edit Chemical' : 'Add Chemical'}>
        <TextInput label="Name" value={chemForm.name} onChange={e => setChemForm({...chemForm, name: e.currentTarget.value})} required />
        <TextInput label="CAS Number" mt="sm" value={chemForm.cas_number} onChange={e => setChemForm({...chemForm, cas_number: e.currentTarget.value})} />
        <NumberInput label="Reorder Threshold" mt="sm" min={0} value={chemForm.reorder_threshold} onChange={val => setChemForm({...chemForm, reorder_threshold: val || 1})} />
        <Select
          label="Chemical Type"
          mt="sm"
          data={CHEMICAL_TYPES}
          value={chemForm.chemical_type}
          onChange={val => setChemForm({...chemForm, chemical_type: val, chemical_type_custom: val !== 'Other' ? '' : chemForm.chemical_type_custom})}
        />
        {chemForm.chemical_type === 'Other' && (
          <TextInput label="Specify type" mt="xs" value={chemForm.chemical_type_custom} onChange={e => setChemForm({...chemForm, chemical_type_custom: e.currentTarget.value})} required />
        )}
        <Button fullWidth mt="xl" loading={savingChem} disabled={savingChem} onClick={saveChem}>
          {editingChem ? 'Update' : 'Create'}
        </Button>
      </Modal>

      {/* Container List Modal */}
      <Modal opened={containerModalOpen} onClose={() => setContainerModalOpen(false)} title="Containers" size="lg">
        <Group mb="sm">
          <Button leftSection={<IconPlus size={16} />} onClick={() => {
            setContainerForm({ quantity: 1, location_id: null, container_type: 'glass_bottle', container_type_custom: '', container_size: '', container_unit: 'ml' });
            setAddContainerOpen(true);
          }}>Add Containers</Button>
        </Group>
        {containers.length === 0 ? (
          <Text c="dimmed">No containers for this chemical.</Text>
        ) : (
          <Table>
            <thead><tr><th>PIN</th><th>Status</th><th>Type</th><th>Size</th><th>Unit</th><th>Location</th><th>Opened By</th></tr></thead>
            <tbody>
              {containers.map(c => (
                <tr key={c.id}>
                  <td><Badge color={c.status === 'unopened' ? 'green' : 'blue'}>{c.pin_5}</Badge></td>
                  <td>{c.status}</td>
                  <td>{c.container_type || '—'}</td>
                  <td>{c.container_size || '—'}</td>
                  <td>{c.container_unit || '—'}</td>
                  <td>{locations.find(l => l.id === c.location_id)?.name || c.location_id}</td>
                  <td>{c.opened_by || '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        <Modal opened={addContainerOpen} onClose={() => setAddContainerOpen(false)} title="Add Containers">
          <NumberInput label="Quantity" min={1} value={containerForm.quantity} onChange={val => setContainerForm({...containerForm, quantity: val || 1})} />
          <Select
            label="Location"
            mt="sm"
            data={locations.map(l => ({ value: l.id.toString(), label: l.name }))}
            value={containerForm.location_id?.toString()}
            onChange={val => setContainerForm({...containerForm, location_id: val ? parseInt(val) : null})}
            required
          />
          <Select
            label="Container Type"
            mt="sm"
            data={CONTAINER_TYPES}
            value={containerForm.container_type}
            onChange={val => setContainerForm({...containerForm, container_type: val, container_type_custom: val !== 'other' ? '' : containerForm.container_type_custom})}
          />
          {containerForm.container_type === 'other' && (
            <TextInput label="Specify type" mt="xs" value={containerForm.container_type_custom} onChange={e => setContainerForm({...containerForm, container_type_custom: e.currentTarget.value})} required />
          )}
          <NumberInput label="Size" mt="sm" value={containerForm.container_size} onChange={val => setContainerForm({...containerForm, container_size: val})} precision={2} />
          <Select
            label="Unit"
            mt="sm"
            data={UNITS}
            value={containerForm.container_unit}
            onChange={val => setContainerForm({...containerForm, container_unit: val})}
          />
          <Button mt="md" fullWidth loading={addingContainers} disabled={!containerForm.location_id} onClick={addContainers}>Add</Button>
        </Modal>

        <Group mt="md" align="flex-end">
          <TextInput
            label="Open container by PIN"
            placeholder="5-digit code"
            value={openPin}
            onChange={e => setOpenPin(e.currentTarget.value)}
            maxLength={5}
            style={{ flex: 1 }}
          />
          <Button loading={openingContainer} disabled={openPin.length !== 5} onClick={openContainerByPin}>Open</Button>
        </Group>
      </Modal>
    </>
  );
}