import { useState, useEffect } from 'react';
import { Title, Table, Button, Group, Badge, Text, Paper, Alert, Modal, NumberInput, Textarea } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function MyLabStock() {
  const { user, hasRole } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [utensils, setUtensils] = useState([]);
  const [error, setError] = useState('');
  const [brokenModal, setBrokenModal] = useState(null); // { type: 'equipment'|'utensil', id, name }
  const [brokenQty, setBrokenQty] = useState(1);
  const [notes, setNotes] = useState('');

  const fetchStock = async () => {
    try {
      const [equipRes, utensilRes] = await Promise.all([
        api.get('/equipment'),
        api.get('/utensils')
      ]);
      setEquipment(equipRes.data);
      setUtensils(utensilRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchStock(); }, []);

  const reportBroken = async () => {
    if (!brokenModal) return;
    setError('');
    try {
      const endpoint = brokenModal.type === 'equipment'
        ? `/equipment/${brokenModal.id}/report-broken`
        : `/utensils/${brokenModal.id}/report-broken`;
      const payload = brokenModal.type === 'utensil' ? { quantity: brokenQty } : {};
      await api.post(endpoint, payload);
      setBrokenModal(null);
      setBrokenQty(1);
      fetchStock();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to report broken');
    }
  };

  return (
    <>
      <Title order={2} mb="lg">My Lab Stock</Title>
      {error && <Alert color="red" mb="md">{error}</Alert>}

      <Paper withBorder p="md" mb="xl">
        <Text weight={600} mb="sm">Equipment</Text>
        {equipment.length === 0 ? <Text color="dimmed">No equipment in your lab.</Text> :
          <Table striped>
            <thead><tr><th>Serial</th><th>Name</th><th>Type</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {equipment.map(equip => (
                <tr key={equip.id}>
                  <td>{equip.org_serial}</td>
                  <td>{equip.name}</td>
                  <td>{equip.type}</td>
                  <td><Badge color={equip.status === 'broken' ? 'red' : 'green'}>{equip.status}</Badge></td>
                  <td>
                    {equip.status !== 'broken' && (
                      <Button size="xs" color="red" leftSection={<IconAlertTriangle size={14} />}
                        onClick={() => setBrokenModal({ type: 'equipment', id: equip.id, name: equip.name })}>
                        Report Broken
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        }
      </Paper>

      <Paper withBorder p="md">
        <Text weight={600} mb="sm">Utensils</Text>
        {utensils.length === 0 ? <Text color="dimmed">No utensils in your lab.</Text> :
          <Table striped>
            <thead><tr><th>Name</th><th>Count</th><th>Action</th></tr></thead>
            <tbody>
              {utensils.map(ut => (
                <tr key={ut.id}>
                  <td>{ut.name}</td>
                  <td>{ut.total_count}</td>
                  <td>
                    {ut.total_count > 0 && (
                      <Button size="xs" color="red" leftSection={<IconAlertTriangle size={14} />}
                        onClick={() => setBrokenModal({ type: 'utensil', id: ut.id, name: ut.name })}>
                        Report Broken
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        }
      </Paper>

      {/* Modal for reporting broken items */}
      <Modal opened={!!brokenModal} onClose={() => setBrokenModal(null)} title={`Report Broken – ${brokenModal?.name}`}>
        {brokenModal?.type === 'utensil' && (
          <NumberInput label="Quantity broken" min={1} value={brokenQty} onChange={setBrokenQty} mb="sm" />
        )}
        <Textarea label="Notes (optional)" value={notes} onChange={e => setNotes(e.currentTarget.value)} mb="md" />
        <Button fullWidth color="red" onClick={reportBroken}>Confirm Broken</Button>
      </Modal>
    </>
  );
}