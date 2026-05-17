import { useEffect, useState } from 'react';
import { Modal, Button, Text, Loader } from '@mantine/core';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { showNotification } from '@mantine/notifications';
import { useAuth } from '../context/AuthContext';

export default function OpenBottle() {
  const [searchParams] = useSearchParams();
  const pin = searchParams.get('pin');
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pin) setOpen(true);
  }, [pin]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Use the existing open endpoint; need chemical_id? The /chemicals/:id/open requires chemical_id, but we only have pin.
      // We'll create a new endpoint /api/chemicals/open-by-pin that just needs the pin.
      await api.post('/chemicals/open-by-pin', { pin_5: pin });
      showNotification({ color: 'green', title: 'Bottle opened' });
      setOpen(false);
    } catch (err) {
      showNotification({ color: 'red', title: err.response?.data?.error || 'Error' });
    } finally { setLoading(false); }
  };

  if (!pin) return <Text>No PIN provided.</Text>;

  return (
    <Modal opened={open} onClose={() => setOpen(false)} title="Open Bottle">
      <Text>Open bottle with PIN <strong>{pin}</strong>?</Text>
      <Button fullWidth mt="md" onClick={handleConfirm} loading={loading}>
        Confirm Open
      </Button>
    </Modal>
  );
}