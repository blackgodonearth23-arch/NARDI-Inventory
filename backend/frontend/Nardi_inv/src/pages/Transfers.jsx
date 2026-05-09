import { useState, useEffect } from 'react';
import {
  Title, Paper, Select, Button, Group, Text, NumberInput, Grid, Alert, TextInput
} from '@mantine/core';
import { IconTransfer } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Transfers() {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [fromLocation, setFromLocation] = useState(null);
  const [toLocation, setToLocation] = useState(null);
  const [items, setItems] = useState([{ item_type: 'bottle', item_id: '', quantity: 1 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch only locations from keeper's lab (API already filters by role)
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const res = await api.get('/locations');
        setLocations(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadLocations();
  }, []);

  // Separate primary and sub-storage for dropdowns
  const primaryLocations = locations.filter(l => l.type === 'primary');
  const subLocations = locations.filter(l => l.type === 'lab_sub');

  const addItem = () =>
    setItems([...items, { item_type: 'bottle', item_id: '', quantity: 1 }]);

  const removeItem = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated.length ? updated : [{ item_type: 'bottle', item_id: '', quantity: 1 }]);
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSubmit = async () => {
    setError('');
    if (!fromLocation || !toLocation) {
      setError('Please select source and destination locations.');
      return;
    }
    for (const item of items) {
      if (!item.item_id) {
        setError('All item IDs must be filled.');
        return;
      }
      if (item.item_type === 'utensil' && item.quantity < 1) {
        setError('Quantity must be at least 1.');
        return;
      }
    }

    setLoading(true);
    try {
      await api.post('/transfers', {
        from_location_id: fromLocation,
        to_location_id: toLocation,
        items: items.map(i => ({
          item_type: i.item_type,
          item_id: parseInt(i.item_id),
          quantity: i.item_type === 'utensil' ? i.quantity : 1
        }))
      });
      showNotification({ color: 'green', title: 'Success', message: 'Transfer completed' });
      setFromLocation(null);
      setToLocation(null);
      setItems([{ item_type: 'bottle', item_id: '', quantity: 1 }]);
    } catch (err) {
      setError(err.response?.data?.error || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Title order={2} mb="lg">Transfer Items</Title>
      {error && <Alert color="red" mb="md" onClose={() => setError('')} withCloseButton>{error}</Alert>}
      <Paper withBorder p="md" mb="md">
        <Grid>
          <Grid.Col span={6}>
            <Select
              label="From (Primary Storage)"
              placeholder="Select source"
              data={primaryLocations.map(l => ({ value: l.id.toString(), label: l.name }))}
              value={fromLocation?.toString()}
              onChange={(val) => setFromLocation(parseInt(val))}
              required
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="To (Sub-storage)"
              placeholder="Select destination"
              data={subLocations.map(l => ({ value: l.id.toString(), label: l.name }))}
              value={toLocation?.toString()}
              onChange={(val) => setToLocation(parseInt(val))}
              required
            />
          </Grid.Col>
        </Grid>
      </Paper>

      <Paper withBorder p="md" mb="md">
        {items.map((item, idx) => (
          <Group key={idx} mb="sm" align="flex-end">
            <Select
              label="Type"
              data={[
                { value: 'bottle', label: 'Bottle' },
                { value: 'equipment', label: 'Equipment' },
                { value: 'utensil', label: 'Utensil' }
              ]}
              value={item.item_type}
              onChange={(val) => updateItem(idx, 'item_type', val)}
            />
            <TextInput
              label="Item ID"
              value={item.item_id}
              onChange={(e) => updateItem(idx, 'item_id', e.currentTarget.value)}
              required
            />
            {item.item_type === 'utensil' && (
              <NumberInput
                label="Quantity"
                min={1}
                value={item.quantity}
                onChange={(val) => updateItem(idx, 'quantity', val)}
              />
            )}
            <Button color="red" variant="subtle" onClick={() => removeItem(idx)}>Remove</Button>
          </Group>
        ))}
        <Button variant="outline" onClick={addItem}>+ Add Item</Button>
      </Paper>

      <Button
        fullWidth
        leftSection={<IconTransfer size={18} />}
        onClick={handleSubmit}
        loading={loading}
        disabled={loading || !fromLocation || !toLocation}
      >
        Execute Transfer
      </Button>
    </>
  );
}