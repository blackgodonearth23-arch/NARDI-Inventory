import { useState, useEffect, useMemo } from 'react';
import {
  Title, Tabs, Table, Button, Group, Badge, Modal, TextInput, Select,
  NumberInput, ActionIcon, Text, Paper, Grid, Drawer, Menu
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconTransfer, IconHistory, IconDots } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const DEVICE_TYPES = [
  'laptop', 'desktop', 'smartphone', 'lan_phone',
  'projector', 'cctv_cam', 'switch', 'router', 'other'
];

const STATUSES = ['new', 'available', 'in_use', 'under_repair', 'decommissioned'];

const typeColumns = {
  laptop: ['asset_id', 'computer_name', 'org_serial', 'os', 'processor', 'ram', 'status', 'station', 'office_number', 'assigned_to_employee', 'issued_date', 'price'],
  desktop: ['asset_id', 'computer_name', 'org_serial', 'os', 'processor', 'ram', 'status', 'station', 'office_number', 'assigned_to_employee', 'issued_date', 'price'],
  smartphone: ['asset_id', 'computer_name', 'org_serial', 'imei', 'phone_number', 'voucher', 'brand', 'model', 'status', 'station', 'office_number', 'assigned_to_employee', 'issued_date', 'price'],
  lan_phone: ['asset_id', 'computer_name', 'org_serial', 'extension', 'status', 'station', 'office_number', 'assigned_to_employee', 'issued_date', 'price'],
  projector: ['asset_id', 'computer_name', 'org_serial', 'mount', 'status', 'station', 'office_number', 'assigned_to_employee', 'issued_date', 'price'],
  cctv_cam: ['asset_id', 'computer_name', 'org_serial', 'ip_address', 'resolution', 'status', 'station', 'office_number', 'assigned_to_employee', 'issued_date', 'price'],
  switch: ['asset_id', 'computer_name', 'org_serial', 'ip_address', 'ports_count', 'status', 'station', 'office_number', 'assigned_to_employee', 'issued_date', 'price'],
  router: ['asset_id', 'computer_name', 'org_serial', 'ip_address', 'ports_count', 'status', 'station', 'office_number', 'assigned_to_employee', 'issued_date', 'price'],
  other: ['asset_id', 'computer_name', 'org_serial', 'status', 'station', 'office_number', 'assigned_to_employee', 'issued_date', 'price']
};

const allColumns = ['asset_id', 'computer_name', 'org_serial', 'status', 'station', 'office_number', 'assigned_to_employee', 'issued_date', 'price'];

function StatusBadge({ status, returnDate }) {
  return (
    <Group gap={4}>
      <Badge 
        color={status === 'in_use' ? 'blue' : status === 'available' ? 'green' : status === 'under_repair' ? 'red' : 'gray'}
      >
        {status}
      </Badge>
      {status === 'available' && returnDate && (
        <Text size="xs" c="dimmed">
          (returned {new Date(returnDate).toLocaleDateString()})
        </Text>
      )}
    </Group>
  );
}

export default function ICTHardwareList() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [hardware, setHardware] = useState([]);
  const [stations, setStations] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferItem, setTransferItem] = useState(null);
  const [transferForm, setTransferForm] = useState({});

  function emptyForm() {
    return {
      asset_id: '', 
      computer_name: '', 
      serial_number: '', 
      type: 'laptop',
      model: '', 
      status: 'new', 
      office_number: '', 
      assigned_to_employee: '',
      issued_date: '', 
      price: '', 
      details: {},
      location_id: '', 
      notes: '', 
      purchase_date: ''
    };
  }

  // Clear details when type changes
  useEffect(() => {
    setForm(prev => ({ ...prev, details: {} }));
  }, [form.type]);

  useEffect(() => { fetchHardware(); }, [activeTab]);
  useEffect(() => { fetchStations(); }, []);

  const fetchHardware = async () => {
    try {
      const params = activeTab !== 'all' ? { type: activeTab } : {};
      const res = await api.get('/ict/hardware', { params });
      setHardware(res.data);
    } catch (err) {
      console.error(err);
      showNotification({ color: 'red', title: 'Error', message: 'Failed to load hardware' });
    }
  };

  const fetchStations = async () => {
    try {
      const res = await api.get('/locations', { params: { type: 'station' } });
      setStations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (hw) => {
    setEditing(hw);
    setForm({
      asset_id: hw.asset_id || '',
      computer_name: hw.computer_name || '',
      serial_number: hw.org_serial || '',
      type: hw.type,
      model: hw.model || '',
      status: hw.status,
      office_number: hw.office_number || '',
      assigned_to_employee: hw.assigned_to_employee || '',
      issued_date: hw.issued_date?.slice(0, 10) || '',
      price: hw.price || '',
      details: hw.details || {},
      location_id: hw.location_id?.toString() || '',
      notes: hw.notes || '',
      purchase_date: hw.purchase_date?.slice(0, 10) || ''
    });
    setModalOpen(true);
  };

  const save = async () => {
    try {
      let lab_id = null;
      if (form.location_id) {
        const station = stations.find(s => s.id.toString() === form.location_id.toString());
        if (station) lab_id = station.lab_id;
      }
      if (!lab_id && user.role === 'ict_keeper') {
        lab_id = user.lab_id;
      }

      const payload = {
        asset_id: form.asset_id || null,
        computer_name: form.computer_name,
        serial_number: form.serial_number,
        type: form.type,
        model: form.model,
        status: form.status,
        office_number: form.office_number || null,
        assigned_to_employee: form.assigned_to_employee || null,
        issued_date: form.issued_date || null,
        price: form.price ? parseFloat(form.price) : null,
        details: form.details || {},
        lab_id: lab_id,
        location_id: form.location_id ? parseInt(form.location_id) : null,
        notes: form.notes || '',
        purchase_date: form.purchase_date || null
      };

      if (editing) {
        await api.put(`/ict/hardware/${editing.id}`, payload);
      } else {
        await api.post('/ict/hardware', payload);
      }

      showNotification({ color: 'green', title: 'Success', message: editing ? 'Hardware updated' : 'Hardware added' });
      setModalOpen(false);
      fetchHardware();
    } catch (err) {
      showNotification({ 
        color: 'red', 
        title: 'Error', 
        message: err.response?.data?.error || 'Save failed' 
      });
    }
  };

  const deleteHw = async (id) => {
    if (!window.confirm('Archive this device?')) return;
    try {
      await api.delete(`/ict/hardware/${id}`);
      fetchHardware();
      showNotification({ color: 'green', title: 'Archived' });
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: 'Delete failed' });
    }
  };

  // Transfer functions remain the same
  const openTransfer = (hw) => {
    setTransferItem(hw);
    setTransferForm({
      to_location_id: '',
      new_computer_name: hw.computer_name,
      assigned_to_employee: hw.assigned_to_employee || '',
      office_number: hw.office_number || ''
    });
    setTransferOpen(true);
  };

  const executeTransfer = async () => {
    try {
      const payload = { ...transferForm };
      Object.keys(payload).forEach(k => {
        if (payload[k] === '') payload[k] = undefined;
      });
      await api.post(`/ict/hardware/${transferItem.id}/transfer`, payload);
      showNotification({ color: 'green', title: 'Transferred successfully' });
      setTransferOpen(false);
      fetchHardware();
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: err.response?.data?.error });
    }
  };

  const openDetail = async (hw) => {
    setDetailItem(hw);
    try {
      const res = await api.get(`/ict/hardware/${hw.id}/history`);
      setHistory(res.data);
    } catch {
      setHistory([]);
    }
    setDetailOpen(true);
  };

  const columns = useMemo(() => {
    return activeTab === 'all' ? allColumns : (typeColumns[activeTab] || allColumns);
  }, [activeTab]);

  const renderRow = (hw) => {
    return columns.map(col => {
      let val;

      if (col === 'station') {
        val = hw.station_name || '—';
      } else if (col === 'status') {
        return (
          <td key={col}>
            <StatusBadge status={hw.status} returnDate={hw.return_date} />
          </td>
        );
      } else if (col === 'issued_date') {
        val = hw.issued_date ? new Date(hw.issued_date).toLocaleDateString() : '—';
      } else if (col === 'price') {
        val = hw.price ? `$${Number(hw.price).toFixed(2)}` : '—';
      } else if (col === 'org_serial') {
        val = hw.org_serial || '—';
      } else if (col in (hw.details || {})) {
        val = hw.details[col] || '—';
      } else {
        val = hw[col] || '—';
      }

      return <td key={col}>{val}</td>;
    });
  };

  return (
    <>
      <Title order={2} mb="lg">ICT Hardware Management</Title>

      <Group mb="md">
        <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>
          Add Hardware
        </Button>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          {[...DEVICE_TYPES.filter(t => t !== 'other'), 'other', 'all'].map(t => (
            <Tabs.Tab key={t} value={t}>
              {t.replace('_', ' ').toUpperCase()}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <Paper withBorder mt="md">
        <Table striped highlightOnHover>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col}>
                  {col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {hardware.map(hw => (
              <tr key={hw.id}>
                {renderRow(hw)}
                <td>
                  <Menu shadow="md" width={200}>
                    <Menu.Target>
                      <ActionIcon variant="default">
                        <IconDots size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => openEdit(hw)}>
                        Edit
                      </Menu.Item>
                      <Menu.Item leftSection={<IconTransfer size={16} />} onClick={() => openTransfer(hw)}>
                        Transfer
                      </Menu.Item>
                      <Menu.Item leftSection={<IconHistory size={16} />} onClick={() => openDetail(hw)}>
                        History
                      </Menu.Item>
                      <Menu.Item leftSection={<IconTrash size={16} />} color="red" onClick={() => deleteHw(hw.id)}>
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>

      {/* Add/Edit Modal (unchanged) */}
      <Modal 
        opened={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={editing ? 'Edit Hardware' : 'Add Hardware'} 
        size="xl"
      >
        <Grid>
          <Grid.Col span={4}>
            <TextInput label="Asset ID" value={form.asset_id} onChange={e => setForm({ ...form, asset_id: e.target.value })} required />
          </Grid.Col>
          <Grid.Col span={4}>
            <TextInput 
              label="Computer Name" 
              value={form.computer_name} 
              onChange={e => setForm({ ...form, computer_name: e.target.value })} 
              required={['laptop', 'desktop'].includes(form.type)} 
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <TextInput label="Serial Number" value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} required />
          </Grid.Col>

          <Grid.Col span={4}>
            <Select label="Type" data={DEVICE_TYPES} value={form.type} onChange={val => setForm({ ...form, type: val })} required />
          </Grid.Col>
          <Grid.Col span={4}>
            <TextInput label="Model" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
          </Grid.Col>
          <Grid.Col span={4}>
            <Select label="Status" data={STATUSES} value={form.status} onChange={val => setForm({ ...form, status: val })} />
          </Grid.Col>

          <Grid.Col span={4}>
            <TextInput label="Office Number" value={form.office_number} onChange={e => setForm({ ...form, office_number: e.target.value })} />
          </Grid.Col>
          <Grid.Col span={4}>
            <TextInput label="Assigned To" value={form.assigned_to_employee} onChange={e => setForm({ ...form, assigned_to_employee: e.target.value })} />
          </Grid.Col>
          <Grid.Col span={4}>
            <TextInput type="date" label="Issued Date" value={form.issued_date} onChange={e => setForm({ ...form, issued_date: e.target.value })} />
          </Grid.Col>

          <Grid.Col span={4}>
            <NumberInput label="Price" value={form.price} onChange={val => setForm({ ...form, price: val })} precision={2} />
          </Grid.Col>
          <Grid.Col span={4}>
            <Select 
              label="Station" 
              data={stations.map(s => ({ value: s.id.toString(), label: `${s.name} (${s.lab_id})` }))} 
              value={form.location_id} 
              onChange={val => setForm({ ...form, location_id: val })} 
              clearable 
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <TextInput label="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </Grid.Col>

          {/* ==================== DYNAMIC FIELDS ==================== */}
          {['laptop', 'desktop'].includes(form.type) && (
            <>
              <Grid.Col span={4}><TextInput label="OS" value={form.details.os || ''} onChange={e => setForm({ ...form, details: { ...form.details, os: e.target.value } })} /></Grid.Col>
              <Grid.Col span={4}><TextInput label="Processor" value={form.details.processor || ''} onChange={e => setForm({ ...form, details: { ...form.details, processor: e.target.value } })} /></Grid.Col>
              <Grid.Col span={4}><TextInput label="RAM" value={form.details.ram || ''} onChange={e => setForm({ ...form, details: { ...form.details, ram: e.target.value } })} /></Grid.Col>
            </>
          )}

          {form.type === 'smartphone' && (
            <>
              <Grid.Col span={4}><TextInput label="IMEI" value={form.details.imei || ''} onChange={e => setForm({ ...form, details: { ...form.details, imei: e.target.value } })} /></Grid.Col>
              <Grid.Col span={4}><TextInput label="Phone Number" value={form.details.phone_number || ''} onChange={e => setForm({ ...form, details: { ...form.details, phone_number: e.target.value } })} /></Grid.Col>
              <Grid.Col span={4}><TextInput label="Voucher" value={form.details.voucher || ''} onChange={e => setForm({ ...form, details: { ...form.details, voucher: e.target.value } })} /></Grid.Col>
              <Grid.Col span={4}><TextInput label="Brand" value={form.details.brand || ''} onChange={e => setForm({ ...form, details: { ...form.details, brand: e.target.value } })} /></Grid.Col>
              <Grid.Col span={4}><TextInput label="Model" value={form.details.model || ''} onChange={e => setForm({ ...form, details: { ...form.details, model: e.target.value } })} /></Grid.Col>
            </>
          )}

          {form.type === 'lan_phone' && (
            <Grid.Col span={4}>
              <TextInput label="Extension" value={form.details.extension || ''} onChange={e => setForm({ ...form, details: { ...form.details, extension: e.target.value } })} />
            </Grid.Col>
          )}

          {form.type === 'projector' && (
            <Grid.Col span={4}>
              <Select 
                label="Mount" 
                data={['ceiling', 'mobile']} 
                value={form.details.mount || ''} 
                onChange={val => setForm({ ...form, details: { ...form.details, mount: val } })} 
                clearable 
              />
            </Grid.Col>
          )}

          {['cctv_cam', 'switch', 'router'].includes(form.type) && (
            <>
              <Grid.Col span={4}>
                <TextInput 
                  label="IP Address" 
                  value={form.details.ip_address || ''} 
                  onChange={e => setForm({ ...form, details: { ...form.details, ip_address: e.target.value } })} 
                />
              </Grid.Col>

              {form.type !== 'cctv_cam' && (
                <Grid.Col span={4}>
                  <NumberInput 
                    label="Ports" 
                    value={form.details.ports_count ?? ''} 
                    onChange={val => setForm({ ...form, details: { ...form.details, ports_count: val } })} 
                  />
                </Grid.Col>
              )}

              {form.type === 'cctv_cam' && (
                <Grid.Col span={4}>
                  <TextInput 
                    label="Resolution" 
                    value={form.details.resolution || ''} 
                    onChange={e => setForm({ ...form, details: { ...form.details, resolution: e.target.value } })} 
                  />
                </Grid.Col>
              )}
            </>
          )}
        </Grid>

        <Button fullWidth mt="xl" onClick={save}>
          {editing ? 'Update Hardware' : 'Create Hardware'}
        </Button>
      </Modal>

      {/* Transfer Modal */}
      <Modal opened={transferOpen} onClose={() => setTransferOpen(false)} title={`Transfer ${transferItem?.asset_id}`}>
        <Select
          label="New Station"
          data={stations.map(s => ({ value: s.id.toString(), label: s.name }))}
          value={transferForm.to_location_id}
          onChange={val => setTransferForm({ ...transferForm, to_location_id: val })}
          clearable
        />
        <TextInput label="New Computer Name" value={transferForm.new_computer_name} onChange={e => setTransferForm({ ...transferForm, new_computer_name: e.target.value })} mt="sm" />
        <TextInput label="Assign To Employee" value={transferForm.assigned_to_employee} onChange={e => setTransferForm({ ...transferForm, assigned_to_employee: e.target.value })} mt="sm" />
        <TextInput label="Office Number" value={transferForm.office_number} onChange={e => setTransferForm({ ...transferForm, office_number: e.target.value })} mt="sm" />
        <Button fullWidth mt="xl" onClick={executeTransfer}>Execute Transfer</Button>
      </Modal>

      {/* Detail Drawer */}
      <Drawer opened={detailOpen} onClose={() => setDetailOpen(false)} title={`History: ${detailItem?.asset_id}`} position="right" size="md">
        <Table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Changed By</th>
              <th>Changes</th>
            </tr>
          </thead>
          <tbody>
            {history.map(entry => (
              <tr key={entry.id}>
                <td>{new Date(entry.created_at).toLocaleString()}</td>
                <td>{entry.action}</td>
                <td>{entry.changed_by_name}</td>
                <td>
                  <details>
                    <summary>View Changes</summary>
                    <pre style={{ fontSize: '12px', marginTop: '8px' }}>
                      {JSON.stringify(entry.new_values, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Drawer>
    </>
  );
}