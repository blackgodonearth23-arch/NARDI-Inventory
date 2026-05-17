import { useState, useEffect } from 'react';
import {
  Title, Paper, Select, Button, NumberInput, Alert, Group, Text
} from '@mantine/core';
import { IconTransfer } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Transfers() {
  const { user } = useAuth();
  const labType = user?.lab_type;
  const isChemistry = labType === 'Chemistry';
  const isICT = labType === 'ICT';
  const isAdmin = user?.role === 'admin';

  // Determine allowed item types based on lab
  const allowedItemTypes = [];
  if (isChemistry || isAdmin) allowedItemTypes.push('chemical');
  if (isICT || isAdmin) allowedItemTypes.push('ict_hardware');

  const [itemType, setItemType] = useState(allowedItemTypes[0] || '');

  // Chemical state
  const [chemicals, setChemicals] = useState([]);
  const [selectedChemical, setSelectedChemical] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [fromLocation, setFromLocation] = useState(null);
  const [toLocation, setToLocation] = useState(null);

  // ICT hardware state
  const [hardwareList, setHardwareList] = useState([]);
  const [selectedHardware, setSelectedHardware] = useState(null);
  const [toLocationICT, setToLocationICT] = useState(null);
  const [newComputerName, setNewComputerName] = useState('');
  const [assignedEmployee, setAssignedEmployee] = useState('');
  const [officeNumber, setOfficeNumber] = useState('');

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch locations (all labs – will be filtered when needed)
    api.get('/locations').then(res => setLocations(res.data || [])).catch(console.error);

    // Fetch chemicals in stock if Chemistry
    if (isChemistry || isAdmin) {
      api.get('/labs/stock')
        .then(res => setChemicals(res.data || []))
        .catch(console.error);
    }

    // Fetch ICT hardware if ICT
    if (isICT || isAdmin) {
      api.get('/ict/hardware', { params: { lab_id: user.lab_id } })
        .then(res => setHardwareList(res.data || []))
        .catch(console.error);
    }
  }, []);

  // Primary/sub locations (unchanged)
  const primaryLocations = locations.filter(l => l.type === 'primary');
  const subLocations = locations.filter(l => l.type === 'lab_sub');

  // Auto-select primary if only one
  useEffect(() => {
    if (primaryLocations.length === 1) {
      setFromLocation(primaryLocations[0].id);
    }
  }, [primaryLocations]);

  const handleTransfer = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = { item_type: itemType };
      if (itemType === 'chemical') {
        if (!selectedChemical || !fromLocation || !toLocation || quantity < 1) {
          setError('Please fill all fields.');
          setLoading(false);
          return;
        }
        payload.chemical_id = selectedChemical;
        payload.quantity = quantity;
        payload.from_location_id = fromLocation;
        payload.to_location_id = toLocation;
      } else if (itemType === 'ict_hardware') {
        if (!selectedHardware || !toLocationICT) {
          setError('Please select hardware and destination.');
          setLoading(false);
          return;
        }
        payload.hardware_id = selectedHardware;
        payload.to_location_id = toLocationICT;
        if (newComputerName) payload.new_computer_name = newComputerName;
        if (assignedEmployee) payload.assigned_to_employee = assignedEmployee;
        if (officeNumber) payload.office_number = officeNumber;
      }

      await api.post('/transfers', payload);
      showNotification({ color: 'green', title: 'Transfer successful' });
      // Reset
      setSelectedChemical(null);
      setSelectedHardware(null);
      setQuantity(1);
      setToLocation(null);
      setToLocationICT(null);
      setNewComputerName('');
      setAssignedEmployee('');
      setOfficeNumber('');
    } catch (err) {
      setError(err.response?.data?.error || 'Transfer failed');
    } finally { setLoading(false); }
  };

  if (allowedItemTypes.length === 0) {
    return <Alert color="gray">Transfers are not available for your lab type.</Alert>;
  }

  return (
    <>
      <Title order={2} mb="lg">Transfer Items</Title>
      {error && <Alert color="red" mb="md" onClose={() => setError('')} withCloseButton>{error}</Alert>}

      <Paper withBorder p="md" mb="md">
        <Select
          label="Item Type"
          data={allowedItemTypes.map(t => ({ value: t, label: t === 'chemical' ? 'Chemical' : 'ICT Hardware' }))}
          value={itemType}
          onChange={setItemType}
          mb="sm"
        />

        {itemType === 'chemical' && (
          <>
            <Select
              label="Chemical"
              placeholder="Select a chemical"
              data={chemicals.map(c => ({ value: c.id.toString(), label: c.name }))}
              value={selectedChemical?.toString()}
              onChange={val => setSelectedChemical(val ? parseInt(val) : null)}
              searchable
              clearable
            />
            <NumberInput
              label="Number of Bottles to Transfer"
              mt="sm"
              min={1}
              value={quantity}
              onChange={val => setQuantity(val || 1)}
            />
            <Select
              label="From (Primary Storage)"
              data={primaryLocations.map(l => ({ value: l.id.toString(), label: l.name }))}
              value={fromLocation?.toString()}
              onChange={val => setFromLocation(val ? parseInt(val) : null)}
              required
              mt="sm"
              disabled={primaryLocations.length === 1}
            />
            <Select
              label="To (Sub‑storage)"
              data={subLocations.map(l => ({ value: l.id.toString(), label: l.name }))}
              value={toLocation?.toString()}
              onChange={val => setToLocation(val ? parseInt(val) : null)}
              required
              mt="sm"
            />
          </>
        )}

        {itemType === 'ict_hardware' && (
          <>
            <Select
              label="ICT Hardware"
              placeholder="Select a device"
              data={hardwareList.map(h => ({
                value: h.id.toString(),
                label: `${h.asset_id || h.id} – ${h.computer_name || h.type}`
              }))}
              value={selectedHardware?.toString()}
              onChange={val => setSelectedHardware(val ? parseInt(val) : null)}
              searchable
              clearable
            />
            <Select
              label="Transfer To (Location)"
              data={locations.map(l => ({ value: l.id.toString(), label: l.name }))}
              value={toLocationICT?.toString()}
              onChange={val => setToLocationICT(val ? parseInt(val) : null)}
              required
              mt="sm"
            />
            <TextInput
              label="New Computer Name (optional)"
              mt="sm"
              value={newComputerName}
              onChange={e => setNewComputerName(e.currentTarget.value)}
            />
            <TextInput
              label="Assign to Employee (optional)"
              mt="sm"
              value={assignedEmployee}
              onChange={e => setAssignedEmployee(e.currentTarget.value)}
            />
            <TextInput
              label="Office Number (optional)"
              mt="sm"
              value={officeNumber}
              onChange={e => setOfficeNumber(e.currentTarget.value)}
            />
          </>
        )}
      </Paper>

      <Button
        fullWidth
        leftSection={<IconTransfer size={18} />}
        onClick={handleTransfer}
        loading={loading}
        disabled={loading || (itemType === 'chemical' && (!selectedChemical || !fromLocation || !toLocation || quantity < 1)) ||
                  (itemType === 'ict_hardware' && (!selectedHardware || !toLocationICT))}
      >
        Transfer
      </Button>
    </>
  );
}