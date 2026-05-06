import { useState, useEffect } from 'react';
import {
  Title, Paper, Group, Button, Select, Table, Checkbox, Text,
  Alert, Badge, Modal, Stack, MultiSelect
} from '@mantine/core';
import { IconTransferIn, IconArrowRight } from '@tabler/icons-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Transfers() {
  const { hasRole } = useAuth();
  const [locations, setLocations] = useState([]);
  const [mainLocation, setMainLocation] = useState(null);
  const [labSublocations, setLabSublocations] = useState([]);
  const [bottles, setBottles] = useState([]);
  const [selectedBottles, setSelectedBottles] = useState([]);   // bottle IDs to transfer
  const [toLocation, setToLocation] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch all locations and filter
  const fetchLocations = async () => {
    const res = await api.get('/locations');
    const allLocs = res.data;
    setLocations(allLocs);
    const main = allLocs.find(l => l.type === 'main');
    setMainLocation(main);
    setLabSublocations(allLocs.filter(l => l.type === 'lab_sub'));
  };

  // Fetch unopened bottles in Main Storage
  const fetchBottlesInMain = async () => {
    if (!mainLocation) return;
    try {
      const res = await api.get('/bottles', { params: { location_id: mainLocation.id } });
      // Filter only unopened
      const unopened = res.data.filter(b => b.status === 'unopened');
      setBottles(unopened);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (mainLocation) {
      fetchBottlesInMain();
    }
  }, [mainLocation]);

  // Toggle bottle selection
  const toggleBottle = (bottleId) => {
    setSelectedBottles(prev =>
      prev.includes(bottleId) ? prev.filter(id => id !== bottleId) : [...prev, bottleId]
    );
  };

  // Send transfer
  const handleTransfer = async () => {
    setError('');
    setSuccess('');
    if (!toLocation) {
      setError('Please select a destination lab sub‑storage');
      return;
    }
    if (selectedBottles.length === 0) {
      setError('Please select at least one bottle to transfer');
      return;
    }
    setLoading(true);
    try {
      const items = selectedBottles.map(id => ({
        item_type: 'bottle',
        item_id: id,
        quantity: 1
      }));
      await api.post('/transfers', {
        from_location_id: mainLocation.id,
        to_location_id: parseInt(toLocation),
        items
      });
      setSuccess(`Successfully transferred ${items.length} bottle(s)`);
      // Refresh bottle list
      fetchBottlesInMain();
      setSelectedBottles([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  // grouped bottles by chemical name
  const bottlesByChemical = bottles.reduce((acc, b) => {
    const name = b.chemical_name || 'Unknown';
    if (!acc[name]) acc[name] = [];
    acc[name].push(b);
    return acc;
  }, {});

  return (
    <>
      <Title order={2} mb="lg">Transfers (Main → Lab)</Title>

      {error && <Alert color="red" mb="md">{error}</Alert>}
      {success && <Alert color="green" mb="md">{success}</Alert>}

      <Paper withBorder p="md" mb="md">
        <Group align="end">
          <Select
            label="Destination Lab Sub‑storage"
            placeholder="Choose a lab location"
            data={labSublocations.map(l => ({ value: String(l.id), label: l.name }))}
            value={toLocation}
            onChange={setToLocation}
            required
            style={{ width: 300 }}
          />
          <Button
            leftSection={<IconTransferIn size={18} />}
            onClick={handleTransfer}
            loading={loading}
            disabled={!toLocation || selectedBottles.length === 0}
          >
            Transfer Selected Bottles
          </Button>
        </Group>
        <Text size="sm" color="dimmed" mt="xs">
          Select unopened bottles from Main Storage and choose a lab sub‑storage above.
        </Text>
      </Paper>

      <Paper withBorder p="md">
        <Group position="apart" mb="sm">
          <Text weight={600}>Bottles in Main Storage (unopened)</Text>
          <Button size="xs" variant="light" onClick={fetchBottlesInMain}>Refresh</Button>
        </Group>

        {Object.keys(bottlesByChemical).length === 0 ? (
          <Text color="dimmed">No unopened bottles in Main Storage.</Text>
        ) : (
          Object.entries(bottlesByChemical).map(([chemName, bottleList]) => (
            <div key={chemName} style={{ marginBottom: 16 }}>
              <Text weight={500} mb={4}>{chemName}</Text>
              <Table striped>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>Select</th>
                    <th>PIN</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bottleList.map(b => (
                    <tr key={b.id}>
                      <td>
                        <Checkbox
                          checked={selectedBottles.includes(b.id)}
                          onChange={() => toggleBottle(b.id)}
                        />
                      </td>
                      <td>{b.pin_5}</td>
                      <td><Badge color="green">{b.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ))
        )}
      </Paper>
    </>
  );
}