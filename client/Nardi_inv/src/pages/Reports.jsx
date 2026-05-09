import { useState, useEffect } from 'react';
import {
  Title, Paper, Group, Button, Select, TextInput, Table, Text,
  Alert, Tabs, SimpleGrid, LoadingOverlay
} from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { IconDownload, IconChartBar, IconListDetails } from '@tabler/icons-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../api/axios';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('usage');
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), 0, 1));  // Jan 1
  const [to, setTo] = useState(new Date());
  const [labId, setLabId] = useState(null);
  const [labs, setLabs] = useState([]);
  const [usageData, setUsageData] = useState(null);
  const [restockList, setRestockList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLabs = async () => {
    try {
      const res = await api.get('/labs');
      setLabs(res.data);
    } catch (e) {}
  };

  useEffect(() => { fetchLabs(); }, []);

  const fetchUsage = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        from: from.toISOString().slice(0,10),
        to: to.toISOString().slice(0,10)
      };
      if (labId) params.lab_id = labId;
      const res = await api.get('/reports/usage', { params });
      const grouped = res.data.data; // { "2026-05": [ {chemical_name, bottles_opened}, ... ], ... }
      // Transform for Recharts (each month one entry with chemicals stacked)
      const allChemicals = new Set();
      const monthMap = {};
      for (const [month, items] of Object.entries(grouped)) {
        monthMap[month] = {};
        for (const item of items) {
          allChemicals.add(item.chemical_name);
          monthMap[month][item.chemical_name] = item.bottles_opened;
        }
      }
      const chartData = Object.keys(monthMap).sort().map(month => ({
        month,
        ...monthMap[month]
      }));
      setUsageData({ chartData, chemicals: Array.from(allChemicals) });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load usage');
    } finally {
      setLoading(false);
    }
  };

  const fetchRestock = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/reports/restock-list');
      setRestockList(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    const params = new URLSearchParams({
      from: from.toISOString().slice(0,10),
      to: to.toISOString().slice(0,10)
    });
    if (labId) params.append('lab_id', labId);
    window.open(`/api/reports/export/excel?${params.toString()}`, '_blank');
  };

  const downloadPDF = () => {
    window.open('/api/reports/export/pdf', '_blank');
  };

  return (
    <>
      <Title order={2} mb="md">Reports & Exports</Title>

      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="usage" leftSection={<IconChartBar size={16} />}>Usage Trends</Tabs.Tab>
          <Tabs.Tab value="restock" leftSection={<IconListDetails size={16} />}>Restock List</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="usage" pt="md">
          <Paper withBorder p="md" mb="md">
            <Group>
              <DatePicker type="range" label="From" value={from} onChange={setFrom} />
              <DatePicker type="range" label="To" value={to} onChange={setTo} />
              <Select
                label="Lab (all if empty)"
                data={labs.map(l => ({ value: String(l.id), label: l.name }))}
                value={labId ? String(labId) : null}
                onChange={val => setLabId(val ? Number(val) : null)}
                clearable
              />
              <Button onClick={fetchUsage} mt={24}>Generate</Button>
            </Group>
          </Paper>

          {loading && <LoadingOverlay visible />}
          {error && <Alert color="red" mb="md">{error}</Alert>}

          {usageData && usageData.chartData.length > 0 && (
            <>
              <Paper withBorder p="md" mb="md">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={usageData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    {usageData.chemicals.map((name, idx) => (
                      <Bar key={name} dataKey={name} stackId="a" fill={['#228be6', '#40c057', '#fa5252', '#fd7e14', '#7950f2'][idx % 5]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
              <Button leftSection={<IconDownload size={16} />} onClick={downloadExcel}>
                Export to Excel
              </Button>
            </>
          )}
          {usageData && usageData.chartData.length === 0 && <Text color="dimmed">No usage data for this period.</Text>}
        </Tabs.Panel>

        <Tabs.Panel value="restock" pt="md">
          <Group mb="md">
            <Button onClick={fetchRestock}>Generate Restock List</Button>
            <Button onClick={downloadPDF} leftSection={<IconDownload size={16} />} variant="outline">Export PDF</Button>
          </Group>

          {loading && <LoadingOverlay visible />}
          {error && <Alert color="red" mb="md">{error}</Alert>}

          {restockList.length === 0 ? (
            <Text color="dimmed">No chemicals below reorder point.</Text>
          ) : (
            <Paper withBorder>
              <Table striped>
                <thead><tr><th>Chemical</th><th>Location</th><th>Lab</th><th>Unopened</th><th>Threshold</th></tr></thead>
                <tbody>
                  {restockList.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.name}</td>
                      <td>{item.location_name}</td>
                      <td>{item.lab_name}</td>
                      <td>{item.unopened_count}</td>
                      <td>{item.reorder_threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Paper>
          )}
        </Tabs.Panel>
      </Tabs>
    </>
  );
}