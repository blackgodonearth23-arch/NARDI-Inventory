import { useState, useEffect } from 'react';
import {
  Title, Paper, Table, Button, Group, Badge, Modal, TextInput, Select,
  NumberInput, Text, Alert, Grid, Menu
} from '@mantine/core';
import {
  IconPlus, IconEdit, IconTrash, IconPackage, IconTransfer
} from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ActionsMenu from '../components/ActionsMenu';

const CHEMICAL_TYPES = ['Solution', 'Solvent', 'Salt', 'Acid', 'Base', 'Indicator', 'Buffer', 'Standard', 'Other'];
const CONTAINER_TYPES = ['glass_bottle', 'plastic_bottle', 'metal_canister', 'other'];
const UNITS = ['ml', 'l', 'g', 'kg', 'bottle', 'other'];

export default function ChemicalInventory() {
  const { user } = useAuth();
  const [chemicals, setChemicals] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filterType, setFilterType] = useState(null);

  // Chemical form state
  const [chemModalOpen, setChemModalOpen] = useState(false);
  const [editingChem, setEditingChem] = useState(null);
  const [chemForm, setChemForm] = useState({
    name: '', cas_number: '', reorder_threshold: 1,
    chemical_type: 'Other', chemical_type_custom: ''
  });
  const [savingChem, setSavingChem] = useState(false);

  // Bottle management (container renamed to bottles in UI)
  const [selectedChem, setSelectedChem] = useState(null);
  const [bottles, setBottles] = useState([]);
  const [bottleModalOpen, setBottleModalOpen] = useState(false);
  const [addBottleOpen, setAddBottleOpen] = useState(false);
  const [bottleForm, setBottleForm] = useState({
    quantity: 1, location_id: null,
    container_type: 'glass_bottle', container_type_custom: '',
    container_size: '', container_unit: 'ml'
  });
  const [addingBottles, setAddingBottles] = useState(false);
  const [openPin, setOpenPin] = useState('');
  const [openingBottle, setOpeningBottle] = useState(false);

  // Inline transfer modal
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferQty, setTransferQty] = useState(1);
  const [transferFrom, setTransferFrom] = useState(null);
  const [transferTo, setTransferTo] = useState(null);
  const [transferLoading, setTransferLoading] = useState(false);

  // Fetch all chemicals
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

  useEffect(() => { fetchLocations(); }, []);
  useEffect(() => { fetchChemicals(); }, [filterType]);

  // ---------- Chemical CRUD ----------
  const openAddChem = () => {
    setEditingChem(null);
    setChemForm({
      name: '', cas_number: '', reorder_threshold: 1,
      chemical_type: 'Other', chemical_type_custom: ''
    });
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
      showNotification({ color: 'green', title: editingChem ? 'Chemical updated' : 'Chemical created' });
      setChemModalOpen(false);
      fetchChemicals();
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: err.response?.data?.error || 'Save failed' });
    } finally { setSavingChem(false); }
  };

  const deleteChem = async (id) => {
    if (!window.confirm('Archive this chemical?')) return;
    await api.delete(`/chemicals/${id}`);
    fetchChemicals();
  };

  // ---------- Bottle management ----------
  const loadBottles = async (chemicalId) => {
    try {
      const res = await api.get(`/chemicals/${chemicalId}/containers`);
      setBottles(res.data);
      setSelectedChem(chemicals.find(c => c.id === chemicalId));
      setBottleModalOpen(true);
    } catch (err) { console.error(err); }
  };

  const addBottles = async () => {
    if (!bottleForm.location_id) return;
    setAddingBottles(true);
    try {
      const containerType = bottleForm.container_type === 'other'
        ? bottleForm.container_type_custom
        : bottleForm.container_type;
      await api.post(`/chemicals/${selectedChem.id}/containers`, {
        quantity: bottleForm.quantity,
        location_id: bottleForm.location_id,
        container_type: containerType,
        container_size: bottleForm.container_size ? parseFloat(bottleForm.container_size) : null,
        container_unit: bottleForm.container_unit || 'ml'
      });
      showNotification({ color: 'green', title: `${bottleForm.quantity} bottle(s) added` });
      setAddBottleOpen(false);
      loadBottles(selectedChem.id);
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: err.response?.data?.error });
    } finally { setAddingBottles(false); }
  };

  const openBottleByPin = async () => {
    if (!openPin || openPin.length !== 5) return;
    setOpeningBottle(true);
    try {
      await api.post(`/chemicals/${selectedChem.id}/open`, { pin_5: openPin });
      showNotification({ color: 'green', title: 'Bottle opened' });
      setOpenPin('');
      loadBottles(selectedChem.id);
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: err.response?.data?.error });
    } finally { setOpeningBottle(false); }
  };

  // ---------- Transfer from within chemicals list ----------
  const openTransferModal = (chem) => {
    setSelectedChem(chem);
    const primaryLocs = locations.filter(l => l.type === 'primary');
    setTransferFrom(primaryLocs.length === 1 ? primaryLocs[0].id : null);
    setTransferTo(null);
    setTransferQty(1);
    setTransferOpen(true);
  };

  const executeTransfer = async () => {
    if (!transferFrom || !transferTo || transferQty < 1) return;
    setTransferLoading(true);
    try {
      await api.post('/transfers', {
        chemical_id: selectedChem.id,
        quantity: transferQty,
        from_location_id: transferFrom,
        to_location_id: transferTo
      });
      showNotification({ color: 'green', title: `${transferQty} bottle(s) transferred` });
      setTransferOpen(false);
      fetchChemicals();
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: err.response?.data?.error });
    } finally { setTransferLoading(false); }
  };

  const primaryLocations = locations.filter(l => l.type === 'primary');
  const subLocations = locations.filter(l => l.type === 'lab_sub');

  // Status color helper
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
              <th>Name</th><th>CAS</th><th>Type</th>
              <th>Status</th><th>Stock (sub/primary)</th>
            </tr>
          </thead>
          <tbody>
            {chemicals.map(chem => (
              <tr key={chem.id}>
                <td>{chem.name}</td>
                <td>{chem.cas_number || '—'}</td>
                <td><Badge variant="light">{chem.chemical_type || 'Other'}</Badge></td>
                <td><Badge color={statusColor(chem.stock_status)}>{chem.stock_status}</Badge></td>
                <td>{chem.stock_display || '0 / 0'}</td>
                <td>
                  <ActionsMenu>
                    <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => openEditChem(chem)}>Edit</Menu.Item>
                    <Menu.Item leftSection={<IconPackage size={16} />} onClick={() => loadBottles(chem.id)}>View Bottles</Menu.Item>
                    <Menu.Item leftSection={<IconTransfer size={16} />} onClick={() => openTransferModal(chem)}>Transfer</Menu.Item>
                    <Menu.Item leftSection={<IconTrash size={16} />} color="red" onClick={() => deleteChem(chem.id)}>Archive</Menu.Item>
                  </ActionsMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>

      {/* ---------- Chemical Add/Edit Modal ---------- */}
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

      {/* ---------- Bottles List Modal ---------- */}
      <Modal opened={bottleModalOpen} onClose={() => setBottleModalOpen(false)} title={`Bottles for ${selectedChem?.name}`} size="lg">
        <Group mb="sm">
          <Button leftSection={<IconPlus size={16} />} onClick={() => {
            setBottleForm({ quantity: 1, location_id: null, container_type: 'glass_bottle', container_type_custom: '', container_size: '', container_unit: 'ml' });
            setAddBottleOpen(true);
          }}>Add Bottles</Button>
        </Group>
        {bottles.length === 0 ? (
          <Text c="dimmed">No bottles for this chemical.</Text>
        ) : (
          <Table>
            <thead><tr><th>PIN</th><th>Status</th><th>Type</th><th>Size</th><th>Unit</th><th>Location</th><th>Opened By</th></tr></thead>
            <tbody>
              {bottles.map(b => (
                <tr key={b.id}>
                  <td><Badge color={b.status === 'unopened' ? 'green' : 'blue'}>{b.pin_5}</Badge></td>
                  <td>{b.status}</td>
                  <td>{b.container_type || '—'}</td>
                  <td>{b.container_size || '—'}</td>
                  <td>{b.container_unit || '—'}</td>
                  <td>{locations.find(l => l.id === b.location_id)?.name || b.location_id}</td>
                  <td>{b.opened_by || '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {/* Add Bottles Sub‑modal */}
        <Modal opened={addBottleOpen} onClose={() => setAddBottleOpen(false)} title="Add Bottles">
          <NumberInput label="Quantity" min={1} value={bottleForm.quantity} onChange={val => setBottleForm({...bottleForm, quantity: val || 1})} />
          <Select
            label="Location"
            mt="sm"
            data={locations.map(l => ({ value: l.id.toString(), label: l.name }))}
            value={bottleForm.location_id?.toString()}
            onChange={val => setBottleForm({...bottleForm, location_id: val ? parseInt(val) : null})}
            required
          />
          <Select
            label="Bottle Type"
            mt="sm"
            data={CONTAINER_TYPES}
            value={bottleForm.container_type}
            onChange={val => setBottleForm({...bottleForm, container_type: val, container_type_custom: val !== 'other' ? '' : bottleForm.container_type_custom})}
          />
          {bottleForm.container_type === 'other' && (
            <TextInput label="Specify type" mt="xs" value={bottleForm.container_type_custom} onChange={e => setBottleForm({...bottleForm, container_type_custom: e.currentTarget.value})} required />
          )}
          <NumberInput label="Size" mt="sm" value={bottleForm.container_size} onChange={val => setBottleForm({...bottleForm, container_size: val})} precision={2} />
          <Select
            label="Unit"
            mt="sm"
            data={UNITS}
            value={bottleForm.container_unit}
            onChange={val => setBottleForm({...bottleForm, container_unit: val})}
          />
          <Button mt="md" fullWidth loading={addingBottles} disabled={!bottleForm.location_id} onClick={addBottles}>Add</Button>
        </Modal>

        {/* Open by PIN */}
        <Group mt="md" align="flex-end">
          <TextInput
            label="Open bottle by PIN"
            placeholder="5-digit code"
            value={openPin}
            onChange={e => setOpenPin(e.currentTarget.value)}
            maxLength={5}
            style={{ flex: 1 }}
          />
          <Button loading={openingBottle} disabled={openPin.length !== 5} onClick={openBottleByPin}>Open</Button>
        </Group>
      </Modal>

      {/* ---------- Inline Transfer Modal ---------- */}
      <Modal opened={transferOpen} onClose={() => setTransferOpen(false)} title={`Transfer Bottles – ${selectedChem?.name}`}>
        <Text mb="sm">
          Available in primary storage: {selectedChem?.primary_count ?? 0}
        </Text>
        <NumberInput
          label="Quantity to Transfer"
          min={1}
          max={selectedChem?.primary_count || 0}
          value={transferQty}
          onChange={val => setTransferQty(val || 1)}
        />
        <Select
          label="From (Primary Storage)"
          data={primaryLocations.map(l => ({ value: l.id.toString(), label: l.name }))}
          value={transferFrom?.toString()}
          onChange={val => setTransferFrom(val ? parseInt(val) : null)}
          disabled={primaryLocations.length === 1}
          mt="sm"
        />
        <Select
          label="To (Sub‑storage)"
          data={subLocations.map(l => ({ value: l.id.toString(), label: l.name }))}
          value={transferTo?.toString()}
          onChange={val => setTransferTo(val ? parseInt(val) : null)}
          mt="sm"
        />
        <Button fullWidth mt="xl" loading={transferLoading} disabled={!transferFrom || !transferTo || transferQty < 1} onClick={executeTransfer}>
          Transfer Bottles
        </Button>
      </Modal>
    </>
  );
}