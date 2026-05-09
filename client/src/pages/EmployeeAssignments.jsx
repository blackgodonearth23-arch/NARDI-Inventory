import { useState } from 'react';
import { Title, TextInput, Button, Table, Paper, Group } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import api from '../api/axios';

export default function EmployeeAssignments() {
  const [name, setName] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await api.get('/ict/hardware/assignments', { params: { employee: name } });
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Title order={2} mb="lg">Employee Assignments</Title>
      <Group mb="md">
        <TextInput
          placeholder="Enter employee name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Button leftSection={<IconSearch size={16} />} onClick={search} loading={loading}>Search</Button>
      </Group>
      <Paper withBorder>
        <Table striped>
          <thead>
            <tr><th>Asset ID</th><th>Computer Name</th><th>Type</th><th>Department</th><th>Office</th><th>Status</th></tr>
          </thead>
          <tbody>
            {results.map(hw => (
              <tr key={hw.id}>
                <td>{hw.asset_id}</td>
                <td>{hw.computer_name || '—'}</td>
                <td>{hw.type}</td>
                <td>{hw.department_name}</td>
                <td>{hw.office_number || '—'}</td>
                <td>{hw.status}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>
    </>
  );
}