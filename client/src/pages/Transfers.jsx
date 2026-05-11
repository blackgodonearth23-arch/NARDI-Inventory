import { useState, useEffect } from 'react';
import { Title, Paper, Select, Button, NumberInput, Alert, Group, Text } from '@mantine/core';
import { IconTransfer } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Transfers() {
  const { user } = useAuth();
  const [chemicals, setChemicals] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedChemical, setSelectedChemical] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [fromLocation, setFromLocation] = useState(null);
  const [toLocation, setToLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch only chemicals that are in stock (unopened > 0) from the lab
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stockRes, locRes] = await Promise.all([
          api.get('/labs/stock'),
          api.get('/locations')
        ]);
        // stockRes.data already contains only chemicals with unopened > 0
        setChemicals(stockRes.data || []);
        setLocations(locRes.data || []);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  // Primary storage locations from keeper's lab (already filtered by backend for keeper)
  const primaryLocations = locations.filter(l => l.type === 'primary');
  const subLocations = locations.filter(l => l.type === 'lab_sub');

  // If there's only one primary location, auto‑select it
  useEffect(() => {
    if (primaryLocations.length === 1) {
      setFromLocation(primaryLocations[0].id);
    } else {
      setFromLocation(null);
    }
  }, [primaryLocations]);

  const handleTransfer = async () => {
    if (!selectedChemical || !fromLocation || !toLocation || quantity < 1) {
      setError('Please fill all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/transfers', {
        chemical_id: selectedChemical,
        quantity,
        from_location_id: fromLocation,
        to_location_id: toLocation
      });
      showNotification({ color: 'green', title: 'Bottles transferred successfully' });
      // Reset
      setSelectedChemical(null);
      setQuantity(1);
      setToLocation(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Transfer failed');
    } finally { setLoading(false); }
  };

  return (
    <>
      <Title order={2} mb="lg">Transfer Bottles</Title>
      {error && <Alert color="red" mb="md" onClose={() => setError('')} withCloseButton>{error}</Alert>}
      <Paper withBorder p="md" mb="md">
        <Select
          label="Chemical"
          placeholder="Select a chemical"
          data={chemicals.map(c => ({ value: c.id.toString(), label: c.name }))}
          value={selectedChemical?.toString()}
          onChange={(val) => setSelectedChemical(val ? parseInt(val) : null)}
          searchable
          clearable
        />
        <NumberInput
          label="Number of Bottles to Transfer"
          mt="sm"
          min={1}
          value={quantity}
          onChange={(val) => setQuantity(val || 1)}
        />
        <Select
          label="From (Primary Storage)"
          placeholder="Auto‑selected or choose source"
          data={primaryLocations.map(l => ({ value: l.id.toString(), label: l.name }))}
          value={fromLocation?.toString()}
          onChange={(val) => setFromLocation(val ? parseInt(val) : null)}
          required
          mt="sm"
          disabled={primaryLocations.length === 1} // still shows selected value
        />
        <Select
          label="To (Sub‑storage)"
          placeholder="Select destination"
          data={subLocations.map(l => ({ value: l.id.toString(), label: l.name }))}
          value={toLocation?.toString()}
          onChange={(val) => setToLocation(val ? parseInt(val) : null)}
          required
          mt="sm"
        />
      </Paper>
      <Button
        fullWidth
        leftSection={<IconTransfer size={18} />}
        onClick={handleTransfer}
        loading={loading}
        disabled={loading || !selectedChemical || !fromLocation || !toLocation || quantity < 1}
      >
        Transfer Bottles
      </Button>
    </>
  );
}