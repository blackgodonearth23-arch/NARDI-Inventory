import { useState, useEffect } from 'react';
import {
  Title, Paper, Table, Button, Modal, TextInput, Select, Group, ActionIcon, Badge, Grid, NumberInput, Menu
} from '@mantine/core';
import { IconEdit, IconTrash, IconUserPlus, IconDots } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [labs, setLabs] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({
    email: '', password: '', display_name: '', role: 'lab_user', lab_id: null, pin_4: ''
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLabs = async () => {
    try {
      const res = await api.get('/labs');
      setLabs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLabs();
  }, []);

  const openCreate = () => {
    setEditUser(null);
    setForm({ email: '', password: '', display_name: '', role: 'lab_user', lab_id: null, pin_4: '' });
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({
      email: u.email,
      password: '',
      display_name: u.display_name,
      role: u.role,
      lab_id: u.lab_id || null,
      pin_4: ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        email: form.email,
        display_name: form.display_name,
        role: form.role,
        lab_id: form.lab_id || null,
      };
      if (form.role === 'lab_user' && form.pin_4) payload.pin_4 = form.pin_4;

      if (editUser) {
        await api.put(`/users/${editUser.id}`, payload);
        showNotification({ color: 'green', title: 'User updated' });
      } else {
        if (!form.password) throw new Error('Password required');
        payload.password = form.password;
        if (form.role === 'lab_user' && !form.pin_4) throw new Error('PIN required for lab user');
        await api.post('/users', payload);
        showNotification({ color: 'green', title: 'User created' });
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Operation failed';
      showNotification({ color: 'red', title: 'Error', message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (window.confirm('Deactivate this user?')) {
      try {
        await api.delete(`/users/${id}`);
        fetchUsers();
        showNotification({ color: 'orange', title: 'User deactivated' });
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <>
      <Title order={2} mb="lg">User Management</Title>
      <Group mb="md">
        <Button leftSection={<IconUserPlus size={16} />} onClick={openCreate}>Add User</Button>
      </Group>
      <Paper withBorder>
        <Table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Display Name</th>
              <th>Role</th>
              <th>Lab</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.display_name}</td>
                <td><Badge>{u.role}</Badge></td>
                <td>{labs.find(l => l.id === u.lab_id)?.name || '—'}</td>
                <td>
                  <Menu shadow="md" width={150}>
                    <Menu.Target>
                      <ActionIcon variant="default">
                        <IconDots size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => openEdit(u)}>
                        Edit
                      </Menu.Item>
                      {u.id !== user.id && (
                        <Menu.Item leftSection={<IconTrash size={16} />} color="red" onClick={() => handleDeactivate(u.id)}>
                          Deactivate
                        </Menu.Item>
                      )}
                    </Menu.Dropdown>
                  </Menu>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editUser ? 'Edit User' : 'Create User'}
        size="lg"
      >
        <Grid>
          <Grid.Col span={12}><TextInput label="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></Grid.Col>
          {!editUser && (
            <Grid.Col span={12}><TextInput label="Password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></Grid.Col>
          )}
          <Grid.Col span={6}><TextInput label="Display Name" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} required /></Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Role"
              data={['admin','lab_keeper','ict_keeper','lab_user']}
              value={form.role}
              onChange={val => setForm({...form, role: val})}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Lab"
              placeholder="None"
              data={labs.map(l => ({ value: l.id.toString(), label: l.name }))}
              value={form.lab_id?.toString()}
              onChange={val => setForm({...form, lab_id: val ? parseInt(val) : null})}
              clearable
            />
          </Grid.Col>
          {form.role === 'lab_user' && (
            <Grid.Col span={6}>
              <TextInput
                label="4-digit PIN"
                value={form.pin_4}
                onChange={e => setForm({...form, pin_4: e.target.value})}
                maxLength={4}
                pattern="[0-9]{4}"
              />
            </Grid.Col>
          )}
        </Grid>
        <Group mt="md" justify="flex-end">
          <Button variant="default" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} disabled={loading}>
            {editUser ? 'Update' : 'Create'}
          </Button>
        </Group>
      </Modal>
    </>
  );
}