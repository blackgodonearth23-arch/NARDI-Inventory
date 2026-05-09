import { useState, useEffect } from 'react';
import { Title, Paper, Text, Group, ThemeIcon, SimpleGrid, Table, Badge, Alert } from '@mantine/core';
import { IconDeviceDesktop, IconLicense, IconAlertTriangle } from '@tabler/icons-react';
import api from '../api/axios';

export default function ICTDashboard() {
  const [hardware, setHardware] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [expiringSoon, setExpiringSoon] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hwRes, licRes] = await Promise.all([
          api.get('/ict/hardware'),
          api.get('/ict/licenses')
        ]);
        setHardware(hwRes.data);
        setLicenses(licRes.data);
        const soon = licRes.data.filter(lic => {
          if (!lic.expiration_date) return false;
          const expiry = new Date(lic.expiration_date);
          const diffDays = (expiry - new Date()) / (1000 * 60 * 60 * 24);
          return diffDays <= 30 && diffDays > 0;
        });
        setExpiringSoon(soon);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const totalHardware = hardware.length;
  const brokenHardware = hardware.filter(h => h.status === 'under_repair').length;

  return (
    <>
      <Title order={2} mb="lg">ICT Dashboard</Title>
      <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'sm', cols: 1 }]} mb="lg">
        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="xl" variant="light"><IconDeviceDesktop size={24} /></ThemeIcon>
            <div><Text c="dimmed" size="xs">Total Hardware Assets</Text><Text weight={700} size="xl">{totalHardware}</Text></div>
          </Group>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="xl" variant="light" color="red"><IconAlertTriangle size={24} /></ThemeIcon>
            <div><Text c="dimmed" size="xs">Hardware Under Repair</Text><Text weight={700} size="xl">{brokenHardware}</Text></div>
          </Group>
        </Paper>
      </SimpleGrid>

      {expiringSoon.length > 0 && (
        <Alert icon={<IconAlertTriangle size={16} />} color="yellow" mb="md">
          {expiringSoon.length} licence(s) expire within 30 days
        </Alert>
      )}

      <Paper withBorder p="md" mb="lg">
        <Text weight={600} mb="sm">Licences Expiring Soon</Text>
        {expiringSoon.length === 0 ? <Text color="dimmed">No upcoming expirations.</Text> : (
          <Table>
            <thead><tr><th>Name</th><th>Type</th><th>Expiry</th><th>Seats Used/Total</th></tr></thead>
            <tbody>
              {expiringSoon.map(lic => (
                <tr key={lic.id}>
                  <td>{lic.name}</td>
                  <td><Badge>{lic.license_type}</Badge></td>
                  <td>{lic.expiration_date?.slice(0,10)}</td>
                  <td>{lic.license_type === 'individual' ? `${lic.seats_used}/${lic.total_seats}` : `– / ${lic.total_seats}`}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Paper>
    </>
  );
}