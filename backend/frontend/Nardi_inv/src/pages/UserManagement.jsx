import { useState, useEffect } from 'react';
import {
  Table, Title, Button, Group, Badge, Modal, TextInput, PasswordInput,
  Select, NumberInput, ActionIcon, Space, Text, Alert
} from '@mantine/core';
import { IconUserPlus, IconTrash, IconEdit, IconKey } from '@tabler/icons-react';
import api from '../api/axios';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [labs, setLabs] = useState([]);
  const [opened, setOpened] = useState(false);
  const [pinOpened, setPinOpened] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
    display_name: '',
    role: 'lab_user',
    lab_id: null,
    pin_4: ''
  });
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    const res = await api.get('/users');
    setUsers(res.data);
  };

  const fetchLabs = async () => {
    const res = await api.get('/labs');
    setLabs(res.data);
  };

  useEffect(() => {
    fetchUsers();
    fetchLabs();
  }, []);

  const handleCreate = async () => {
    setError('');
    try {
      const payload = { ...form };
      if (payload.role !== 'lab_user') delete payload.pin_4;
      if (!payload.lab_id) delete payload.lab_id;
      await api.post('/users', payload);
      setOpened(false);
      fetchUsers();
      // reset form
      setForm({ email: '', password: '', display_name: '', role: 'lab_user', lab_id: null, pin_4: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Creation failed');
    }
  };

  const handleDisable = async (userId) => {
    if (window.confirm('Disable this user?')) {
      await api.delete(`/users/${userId}`);
      fetchUsers();
    }
  };

  const handleEnable = async (userId) => {
    await api.patch(`/users/${userId}`, { is_active: true });
    fetchUsers();
  };

  const handleRoleChange = async (userId, role) => {
    await api.patch(`/users/${userId}`, { role });
    fetchUsers();
  };

  const handlePinUpdate = async () => {
    setError('');
    try {
      await api.patch(`/users/${selectedUser.id}/pin`, {
        pin_4: form.pin_4
      });
      setPinOpened(false);
    } catch (err) {
      setError(err.response?.data?.error || 'PIN update failed');
    }
  };

  return (
    <>
      <Title order={2} mb="lg">User Management</Title>

      <Group position="apart" mb="md">
        <Text>Total users: {users.length}</Text>
        <Button leftSection={<IconUserPlus size={18} />} onClick={() => setOpened(true)}>
          Add User
        </Button>
      </Group>

      <Table striped highlightOnHover>
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Lab</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.display_name}</td>
              <td>
                <Badge color={user.role === 'admin' ? 'red' : user.role === 'lab_keeper' ? 'blue' : 'green'}>
                  {user.role}
                </Badge>
              </td>
              <td>{labs.find(l => l.id === user.lab_id)?.name || '—'}</td>
              <td>
                <Badge color={user.is_active ? 'teal' : 'gray'}>
                  {user.is_active ? 'Active' : 'Disabled'}
                </Badge>
              </td>
              <td>
                <Group spacing="xs">
                  {/* Role dropdown */}
                  <Select
                    size="xs"
                    data={['admin', 'lab_keeper', 'ict_keeper', 'lab_user']}
                    value={user.role}
                    onChange={(val) => handleRoleChange(user.id, val)}
                    w={100}
                  />
                  {/* PIN button – only for lab users */}
                  {user.role === 'lab_user' && (
                    <ActionIcon variant="light" size="sm" onClick={() => {
                      setSelectedUser(user);
                      setForm({ ...form, pin_4: '' });
                      setPinOpened(true);
                    }}>
                      <IconKey size={16} />
                    </ActionIcon>
                  )}
                  {/* Disable / Enable */}
                  {user.is_active ? (
                    <ActionIcon color="red" variant="light" size="sm" onClick={() => handleDisable(user.id)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  ) : (
                    <Button compact size="xs" variant="light" color="green" onClick={() => handleEnable(user.id)}>
                      Enable
                    </Button>
                  )}
                </Group>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Create User Modal */}
      <Modal opened={opened} onClose={() => setOpened(false)} title="Add new user" size="md">
        {error && <Alert color="red" mb="md">{error}</Alert>}
        <TextInput label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.currentTarget.value })} required />
        <PasswordInput label="Password" mt="sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.currentTarget.value })} required />
        <TextInput label="Full Name" mt="sm" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.currentTarget.value })} required />
        <Select label="Role" mt="sm" data={['admin', 'lab_keeper', 'ict_keeper', 'lab_user']} value={form.role} onChange={(val) => setForm({ ...form, role: val })} />
        {form.role === 'lab_user' && (
          <>
            <Select label="Lab" mt="sm" data={labs.map(l => ({ value: String(l.id), label: l.name }))} value={form.lab_id ? String(form.lab_id) : null} onChange={(val) => setForm({ ...form, lab_id: val ? parseInt(val) : null })} />
            <TextInput label="4-digit PIN" mt="sm" maxLength={4} value={form.pin_4} onChange={(e) => setForm({ ...form, pin_4: e.currentTarget.value })} required />
          </>
        )}
        <Button fullWidth mt="xl" onClick={handleCreate}>Create User</Button>
      </Modal>

      {/* PIN Update Modal */}
      <Modal opened={pinOpened} onClose={() => setPinOpened(false)} title={`Set PIN for ${selectedUser?.display_name}`}>
        {error && <Alert color="red" mb="md">{error}</Alert>}
        <TextInput label="New 4-digit PIN" maxLength={4} value={form.pin_4} onChange={(e) => setForm({ ...form, pin_4: e.currentTarget.value })} />
        <Button fullWidth mt="md" onClick={handlePinUpdate}>Update PIN</Button>
      </Modal>
    </>
  );
}