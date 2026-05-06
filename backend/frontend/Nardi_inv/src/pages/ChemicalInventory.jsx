import { useState, useEffect } from 'react';
import {
  Title, Table, Button, Group, Badge, Modal, TextInput, NumberInput, Select,
  ActionIcon, Text, Alert, Paper, Stack, SimpleGrid, Tooltip
} from '@mantine/core';
import { IconPlus, IconTrash, IconFlask, IconBottle, IconClick } from '@tabler/icons-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function ChemicalInventory() {
  const { hasRole } = useAuth();
  const [chemicals, setChemicals] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedChem, setSelectedChem] = useState(null);   // for viewing its bottles
  const [bottles, setBottles] = useState([]);
  const [error, setError] = useState('');

  // Chemical form state
  const [chemOpened, setChemOpened] = useState(false);
  const [editingChem, setEditingChem] = useState(null);
  const [chemForm, setChemForm] = useState({
    name: '',
    cas_number: '',
    unit: 'bottle',
    reorder_threshold: 1
  });

  // Add bottles form
  const [bottleOpened, setBottleOpened] = useState(false);
  const [bottleForm, setBottleForm] = useState({
    quantity: 1,
    location_id: ''
  });

  // Open bottle (lab user)
  const [openOpened, setOpenOpened] = useState(false);
  const [openPin, setOpenPin] = useState('');

  // Fetch data
  const fetchChemicals = async () => {
    const res = await api.get('/chemicals');
    setChemicals(res.data);
  };

  const fetchLocations = async () => {
    const res = await api.get('/locations');
    setLocations(res.data);
  };

  const fetchBottles = async (chemicalId) => {
    // Fetch all bottles for that chemical (no location filter, but we could show per location)
    const res = await api.get(`/chemicals/${chemicalId}/bottles`);
    setBottles(res.data);
  };

  useEffect(() => {
    fetchChemicals();
    fetchLocations();
  }, []);

  // --- Chemical handlers ---
  const openAddChem = () => {
    setEditingChem(null);
    setChemForm({ name: '', cas_number: '', unit: 'bottle', reorder_threshold: 1 });
    setChemOpened(true);
  };

  const openEditChem = (chem) => {
    setEditingChem(chem);
    setChemForm({
      name: chem.name,
      cas_number: chem.cas_number || '',
      unit: chem.unit,
      reorder_threshold: chem.reorder_threshold
    });
    setChemOpened(true);
  };

  const saveChem = async () => {
    setError('');
    try {
      // If editing, send PUT; else POST
      if (editingChem) {
        await api.put(`/chemicals/${editingChem.id}`, chemForm);
      } else {
        await api.post('/chemicals', chemForm);
      }
      setChemOpened(false);
      fetchChemicals();
    } catch (err) {
      setError(err.response?.data?.error || 'Chemical save failed');
    }
  };

  const deleteChem = async (chemId) => {
    if (!window.confirm('Archive this chemical?')) return;
    try {
      await api.delete(`/chemicals/${chemId}`);
      fetchChemicals();
    } catch (err) {
      alert(err.response?.data?.error || 'Deletion failed');
    }
  };

  // --- Bottle handlers ---
  const openAddBottles = (chemicalId) => {
    setSelectedChem(chemicalId);
    setBottleForm({ quantity: 1, location_id: '' });
    setBottleOpened(true);
  };

  const saveBottles = async () => {
    setError('');
    if (!bottleForm.location_id || !bottleForm.quantity) {
      setError('Please select a location and quantity');
      return;
    }
    try {
      await api.post(`/chemicals/${selectedChem}/bottles`, {
        quantity: parseInt(bottleForm.quantity),
        location_id: parseInt(bottleForm.location_id)
      });
      setBottleOpened(false);
      fetchBottles(selectedChem);
      // Also refresh chemicals list to update counts? Not needed, but you could.
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add bottles');
    }
  };

  // --- Open bottle (lab user only) ---
  const openOpenBottle = () => {
    setOpenPin('');
    setOpenOpened(true);
  };

  const handleOpenBottle = async () => {
    setError('');
    if (!openPin || openPin.length !== 5) {
      setError('Enter a valid 5-digit PIN');
      return;
    }
    try {
      // We need a chemical ID for the route, but the open endpoint is POST /chemicals/:id/open
      // The route expects chemical_id? Actually our open route is /chemicals/:id/open. 
      // We need to find out which chemical this bottle belongs to? Let's adjust: 
      // For simplicity, we can have the open form ask for chemical_id + pin, 
      // or we can have an "open" button on each bottle row (from the bottle list). 
      // I'll provide a quick inline fix: we'll open from the bottle list row.
      alert('Use the "Open" button next to each bottle in the list below.');
    } catch (err) {
      // handle error
    }
  };

  // Open a specific bottle by PIN (better: from bottle row)
  const handleOpenBottleByPin = async (chemicalId, pin) => {
    try {
      await api.post(`/chemicals/${chemicalId}/open`, { pin_5: pin });
      fetchBottles(chemicalId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to open bottle');
    }
  };

  // Show bottles for a chemical
  const viewBottles = (chemicalId) => {
    setSelectedChem(chemicalId);
    fetchBottles(chemicalId);
  };

  return (
    <>
      <Title order={2} mb="lg">Chemical Inventory</Title>

      {/* Chemical list + add */}
      <Paper withBorder p="md" mb="xl">
        <Group position="apart" mb="sm">
          <Text weight={600}>Chemicals</Text>
          {(hasRole('lab_keeper')) && (
            <Button size="xs" leftSection={<IconPlus size={16} />} onClick={openAddChem}>
              Add Chemical
            </Button>
          )}
        </Group>

        <Table striped>
          <thead>
            <tr>
              <th>Name</th>
              <th>CAS Number</th>
              <th>Unit</th>
              <th>Reorder Threshold</th>
              <th style={{ width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {chemicals.map((chem) => (
              <tr key={chem.id}>
                <td>{chem.name}</td>
                <td>{chem.cas_number || '—'}</td>
                <td>{chem.unit}</td>
                <td>{chem.reorder_threshold}</td>
                <td>
                  <Group spacing="xs">
                    <Button size="xs" variant="light" onClick={() => viewBottles(chem.id)}>
                      View Bottles
                    </Button>
                    {hasRole('lab_keeper') && (
                      <>
                        <ActionIcon variant="light" size="sm" onClick={() => openEditChem(chem)}>
                          <IconFlask size={16} />
                        </ActionIcon>
                        <ActionIcon color="red" variant="light" size="sm" onClick={() => deleteChem(chem.id)}>
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

      {/* Bottle list for selected chemical */}
      {selectedChem && (
        <Paper withBorder p="md" mb="xl">
          <Group position="apart" mb="sm">
            <Text weight={600}>
              Bottles for {chemicals.find(c => c.id === selectedChem)?.name}
            </Text>
            <Group>
              {hasRole('lab_keeper') && (
                <Button size="xs" leftSection={<IconBottle size={16} />} onClick={() => openAddBottles(selectedChem)}>
                  Add Bottles
                </Button>
              )}
              <Button size="xs" variant="subtle" onClick={() => setSelectedChem(null)}>
                Close
              </Button>
            </Group>
          </Group>
          {bottles.length === 0 ? (
            <Text color="dimmed">No bottles found. Add some via the button above.</Text>
          ) : (
            <Table striped>
              <thead>
                <tr>
                  <th>5‑Digit PIN</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Opened By</th>
                  <th style={{ width: 100 }}>Open</th>
                </tr>
              </thead>
              <tbody>
                {bottles.map((b) => (
                  <tr key={b.id}>
                    <td>{b.pin_5}</td>
                    <td>{locations.find(l => l.id === b.location_id)?.name || '—'}</td>
                    <td>
                      <Badge color={b.status === 'unopened' ? 'green' : 'orange'}>
                        {b.status}
                      </Badge>
                    </td>
                    <td>{b.opened_by ? `User #${b.opened_by}` : '—'}</td>
                    <td>
                      {b.status === 'unopened' && hasRole('lab_user') && (
                        <ActionIcon color="blue" variant="light" size="sm"
                          onClick={() => handleOpenBottleByPin(selectedChem, b.pin_5)}>
                          <IconClick size={16} />
                        </ActionIcon>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Paper>
      )}

      {/* Chemical Modal – same fields */}
      <Modal opened={chemOpened} onClose={() => setChemOpened(false)} title={editingChem ? 'Edit Chemical' : 'Add New Chemical'}>
        {error && <Alert color="red" mb="md">{error}</Alert>}
        <TextInput label="Name" value={chemForm.name} onChange={e => setChemForm({ ...chemForm, name: e.currentTarget.value })} required />
        <TextInput label="CAS Number" mt="sm" value={chemForm.cas_number} onChange={e => setChemForm({ ...chemForm, cas_number: e.currentTarget.value })} />
        <Select label="Unit" mt="sm" data={['bottle', 'ml', 'g', 'l', 'kg']} value={chemForm.unit} onChange={val => setChemForm({ ...chemForm, unit: val })} />
        <NumberInput label="Reorder Threshold" mt="sm" min={0} value={chemForm.reorder_threshold} onChange={val => setChemForm({ ...chemForm, reorder_threshold: val })} />
        <Button fullWidth mt="xl" onClick={saveChem}>{editingChem ? 'Update' : 'Create'}</Button>
      </Modal>

      {/* Add Bottles Modal */}
      <Modal opened={bottleOpened} onClose={() => setBottleOpened(false)} title={`Add Bottles – ${chemicals.find(c => c.id === selectedChem)?.name}`}>
        {error && <Alert color="red" mb="md">{error}</Alert>}
        <NumberInput label="Quantity" min={1} value={bottleForm.quantity} onChange={val => setBottleForm({ ...bottleForm, quantity: val })} />
        <Select label="Location" mt="sm" data={locations.map(l => ({ value: String(l.id), label: l.name }))} value={bottleForm.location_id} onChange={val => setBottleForm({ ...bottleForm, location_id: val })} required />
        <Button fullWidth mt="xl" onClick={saveBottles}>Add Bottles</Button>
      </Modal>
    </>
  );
}