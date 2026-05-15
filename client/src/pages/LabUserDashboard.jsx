import { useEffect, useState } from 'react';
import {
  Title, Paper, Group, SimpleGrid, Modal, Button, Text, Badge, Table,
  TextInput, NumberInput, Card,
} from '@mantine/core';
import { IconFlask, IconClipboardCheck } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function LabUserDashboard() {
  const { user } = useAuth();
  const [chemicals, setChemicals] = useState([]);
  const [selectedChem, setSelectedChem] = useState(null);
  const [containers, setContainers] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [auditModal, setAuditModal] = useState(false);
  const [auditType, setAuditType] = useState('chemical');
  const [auditItems, setAuditItems] = useState([]);

  // New state for utilities
  const [brokenUtils, setBrokenUtils] = useState([]);
  const [availableUtils, setAvailableUtils] = useState({
    equipment: 0,
    utensils: 0,
    ict_hardware: 0,
  });

  useEffect(() => {
    fetchStock();
    fetchUtilityData();
  }, []);

  const fetchStock = async () => {
    try {
      const res = await api.get('/labs/stock');
      setChemicals(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUtilityData = async () => {
    try {
      const [brokenRes, availableRes] = await Promise.all([
        api.get('/utilities', { params: { status: 'broken', lab_id: user.lab_id } }),
        api.get('/utilities', { params: { status: 'working', lab_id: user.lab_id } }),
      ]);
      setBrokenUtils(brokenRes.data || []);
      const items = availableRes.data || [];
      setAvailableUtils({
        equipment: items.filter((i) => i.type === 'equipment').length,
        utensils: items.filter((i) => i.type === 'utensil').length,
        ict_hardware: items.filter((i) => i.type === 'ict_hardware').length,
      });
    } catch (err) {
      console.error('Error fetching utilities:', err);
    }
  };

  const openChemical = async (chemicalId) => {
    try {
      const res = await api.get(`/chemicals/${chemicalId}/containers`);
      setContainers(res.data);
      setSelectedChem(chemicals.find((c) => c.id === chemicalId));
      setOpenModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenClick = (container) => {
    setSelectedContainer(container);
    setOpenConfirm(true);
  };

  const confirmOpen = async () => {
    if (!selectedContainer) return;
    try {
      await api.post(`/chemicals/${selectedChem.id}/open`, {
        pin_5: selectedContainer.pin_5,
      });
      showNotification({ color: 'green', title: 'Container opened' });
      setOpenConfirm(false);
      openChemical(selectedChem.id);
    } catch (err) {
      showNotification({
        color: 'red',
        title: 'Error',
        message: err.response?.data?.error,
      });
    }
  };

  const startAudit = async (type) => {
    setAuditType(type);
    if (type === 'chemical') {
      setAuditItems(
        chemicals.map((c) => ({
          ...c,
          item_id: c.id,
          item_type: 'chemical',
          expected_count: c.unopened_count,
          actual_count: '',
          notes: '',
        }))
      );
    } else {
      try {
        const res = await api.get('/utilities');
        setAuditItems(
          res.data.map((u) => ({
            ...u,
            item_id: u.id,
            item_type: 'utility',
            expected_count: u.total_count,
            actual_count: '',
            notes: '',
          }))
        );
      } catch (err) {
        console.error(err);
      }
    }
    setAuditModal(true);
  };

  const submitAudit = async () => {
    const items = auditItems
      .map((i) => ({
        item_id: i.item_id,
        item_type: i.item_type,
        expected_count: i.expected_count,
        actual_count: i.actual_count !== '' ? parseInt(i.actual_count) : null,
        notes: i.notes,
      }))
      .filter((i) => i.actual_count !== null);

    if (items.length === 0) {
      showNotification({ color: 'yellow', title: 'No changes' });
      return;
    }

    try {
      await api.post('/audits', { type: auditType, items });
      showNotification({ color: 'green', title: 'Audit submitted to keeper' });
      setAuditModal(false);
    } catch (err) {
      showNotification({
        color: 'red',
        title: 'Error',
        message: err.response?.data?.error,
      });
    }
  };

  return (
    <>
      <Title order={2} mb="lg">{user.display_name}'s Lab</Title>

      {/* Utility summary cards */}
      <SimpleGrid cols={{ base: 2, md: 4 }} mb="md">
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Text size="sm" color="dimmed">Available Equipment</Text>
          <Text weight={700}>{availableUtils.equipment}</Text>
        </Card>
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Text size="sm" color="dimmed">Available Utensils</Text>
          <Text weight={700}>{availableUtils.utensils}</Text>
        </Card>
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Text size="sm" color="dimmed">ICT Hardware</Text>
          <Text weight={700}>{availableUtils.ict_hardware}</Text>
        </Card>
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Text size="sm" color="dimmed">Broken Items</Text>
          <Text weight={700} color="red">{brokenUtils.length}</Text>
        </Card>
      </SimpleGrid>

      {/* Broken utilities table */}
      {brokenUtils.length > 0 && (
        <Paper withBorder p="md" mb="md">
          <Text weight={600} mb="xs">Broken Utilities</Text>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {brokenUtils.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td><Badge>{item.type}</Badge></td>
                  <td><Badge color="red">broken</Badge></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Paper>
      )}

      <Group mb="md">
        <Button
          leftSection={<IconClipboardCheck size={16} />}
          onClick={() => startAudit('chemical')}
        >
          Audit Chemicals
        </Button>
        <Button
          leftSection={<IconClipboardCheck size={16} />}
          onClick={() => startAudit('utility')}
        >
          Audit Utilities
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {chemicals.map((chem) => (
          <Paper
            key={chem.id}
            withBorder
            p="md"
            style={{ cursor: 'pointer' }}
            onClick={() => openChemical(chem.id)}
          >
            <Group>
              <IconFlask size={24} />
              <div>
                <Text weight={500}>{chem.name}</Text>
                <Text size="sm" color="dimmed">
                  {chem.unopened_count} containers available
                </Text>
              </div>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Container Details Modal */}
      <Modal
        opened={openModal}
        onClose={() => setOpenModal(false)}
        title={`Containers for ${selectedChem?.name}`}
        size="lg"
      >
        <Table>
          <thead>
            <tr>
              <th>PIN</th>
              <th>Type</th>
              <th>Size</th>
              <th>Unit</th>
              <th>Status</th>
              <th>Location</th>
              <th>Expiry</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {containers.map((cont) => (
              <tr key={cont.id}>
                <td><Badge>{cont.pin_5}</Badge></td>
                <td>{cont.container_type}</td>
                <td>{cont.container_size}</td>
                <td>{cont.container_unit}</td>
                <td>
                  <Badge color={cont.status === 'unopened' ? 'green' : 'blue'}>
                    {cont.status}
                  </Badge>
                </td>
                <td>{cont.location_name || cont.location_id}</td>
                <td>
                  {cont.expiry_date
                    ? new Date(cont.expiry_date).toLocaleDateString()
                    : '—'}
                </td>
                <td>
                  {cont.status === 'unopened' && (
                    <Button size="xs" onClick={() => handleOpenClick(cont)}>
                      Open
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Modal>

      {/* Open Confirmation Modal */}
      <Modal
        opened={openConfirm}
        onClose={() => setOpenConfirm(false)}
        title="Confirm Open"
      >
        <Text>
          Are you sure you want to open container PIN {selectedContainer?.pin_5}?
        </Text>
        <Group mt="md">
          <Button variant="default" onClick={() => setOpenConfirm(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmOpen}>
            Open
          </Button>
        </Group>
      </Modal>

      {/* Audit Modal – unchanged */}
      <Modal
        opened={auditModal}
        onClose={() => setAuditModal(false)}
        title={`Audit ${auditType === 'chemical' ? 'Chemicals' : 'Utilities'}`}
        size="lg"
      >
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Expected</th>
              <th>Actual</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {auditItems.map((item, idx) => (
              <tr key={item.item_id}>
                <td>{item.name}</td>
                <td>{item.expected_count}</td>
                <td>
                  <NumberInput
                    value={item.actual_count}
                    onChange={(val) => {
                      const newItems = [...auditItems];
                      newItems[idx].actual_count = val;
                      setAuditItems(newItems);
                    }}
                    min={0}
                  />
                </td>
                <td>
                  <TextInput
                    value={item.notes}
                    onChange={(e) => {
                      const newItems = [...auditItems];
                      newItems[idx].notes = e.target.value;
                      setAuditItems(newItems);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Button fullWidth mt="md" onClick={submitAudit}>
          Submit Audit
        </Button>
      </Modal>
    </>
  );
}