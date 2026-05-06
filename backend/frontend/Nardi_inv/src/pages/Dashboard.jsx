import { useEffect, useState } from 'react';
import { Title, Paper, Text, Group, ThemeIcon, SimpleGrid } from '@mantine/core';
import { IconUsers, IconBuildingWarehouse, IconFlask } from '@tabler/icons-react';
import api from '../api/axios';

export default function Dashboard() {
  const [stats, setStats] = useState({ users: 0, labs: 0, chemicals: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, labsRes, chemicalsRes] = await Promise.all([
          api.get('/users'),
          api.get('/labs'),
          api.get('/chemicals')
        ]);
        setStats({
          users: usersRes.data.length,
          labs: labsRes.data.length,
          chemicals: chemicalsRes.data.length
        });
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, []);

  return (
    <>
      <Title order={2} mb="lg">Admin Dashboard</Title>
      <SimpleGrid cols={3} breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="xl" variant="light">
              <IconUsers size={24} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs">Total Users</Text>
              <Text weight={700} size="xl">{stats.users}</Text>
            </div>
          </Group>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="xl" variant="light">
              <IconBuildingWarehouse size={24} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs">Labs</Text>
              <Text weight={700} size="xl">{stats.labs}</Text>
            </div>
          </Group>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="xl" variant="light">
              <IconFlask size={24} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs">Chemicals</Text>
              <Text weight={700} size="xl">{stats.chemicals}</Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>
    </>
  );
}