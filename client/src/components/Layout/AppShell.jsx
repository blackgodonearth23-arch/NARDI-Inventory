// client/src/components/AppShell.jsx
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppShell as MantineAppShell,
  Burger,
  Group,
  ThemeIcon,
  NavLink,
  Stack,
  Box,
  Image,
  ActionIcon,
  Tooltip,
  Text,
  Modal,
  TextInput,
  Button,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import {
  IconLogout,
  IconBuildingWarehouse,
  IconFlask,
  IconUsers,
  IconDashboard,
  IconLicense,
  IconDeviceDesktop,
  IconBell,
  IconReport,
  IconTool,
  IconArrowLeft,
  IconHome,
  IconKey,
} from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import AlertBell from '../AlertBell';
import api from "../../api/axios";

export default function AppShell() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [opened, setOpened] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePinChange = async () => {
    if (!newPin || newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      showNotification({
        color: 'yellow',
        title: 'Invalid PIN',
        message: 'PIN must be exactly 4 digits',
      });
      return;
    }
    try {
      await api.put('/auth/pin', { newPin });
      showNotification({
        color: 'green',
        title: 'PIN updated',
        message: 'Your lab PIN has been changed successfully',
      });
      setPinModal(false);
      setNewPin('');
    } catch (err) {
      showNotification({
        color: 'red',
        title: 'Error',
        message: err.response?.data?.error || 'Failed to update PIN',
      });
    }
  };

  const menuItems = [];

  // Admin – sees everything
  if (hasRole('admin')) {
    menuItems.push(
      { icon: IconDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: IconUsers, label: 'User Management', path: '/users' },
      { icon: IconBuildingWarehouse, label: 'Labs & Locations', path: '/labs' },
      { icon: IconFlask, label: 'Chemical Inventory', path: '/chemicals' },
      { icon: IconTool, label: 'Utilities', path: '/utilities' },
      { icon: IconReport, label: 'Reports', path: '/reports' },
      { icon: IconDashboard, label: 'ICT Dashboard', path: '/ict-dashboard' },
      { icon: IconDeviceDesktop, label: 'Hardware', path: '/ict-hardware' },
      { icon: IconLicense, label: 'Licences', path: '/ict-licenses' },
      { icon: IconReport, label: 'Transfers', path: '/transfers' },
      { icon: IconUsers, label: 'Assignments', path: '/ict-assignments' }
    );
  }

  // Lab keeper – modules depend on lab type
  if (hasRole('lab_keeper')) {
    const labType = user?.lab_type;

    if (labType === 'ICT') {
      menuItems.push(
        { icon: IconDashboard, label: 'ICT Dashboard', path: '/ict-dashboard' },
        { icon: IconDeviceDesktop, label: 'Hardware', path: '/ict-hardware' },
        { icon: IconLicense, label: 'Licences', path: '/ict-licenses' },
        { icon: IconUsers, label: 'Assignments', path: '/ict-assignments' },
        { icon: IconReport, label: 'Transfers', path: '/transfers' }
      );
    } else if (labType === 'Chemistry') {
      menuItems.push(
        { icon: IconDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: IconFlask, label: 'Chemical Inventory', path: '/chemicals' },
        { icon: IconBuildingWarehouse, label: 'Storage Locations', path: '/labs' },
        { icon: IconTool, label: 'Utilities', path: '/utilities' },
        { icon: IconReport, label: 'Transfers', path: '/transfers' }
      );
    } else if (labType === 'Other') {
      // Other labs – no transfers
      menuItems.push(
        { icon: IconDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: IconTool, label: 'Utilities', path: '/utilities' },
        { icon: IconBuildingWarehouse, label: 'Storage Locations', path: '/labs' }
      );
    } else {
      // fallback if lab_type missing
      menuItems.push(
        { icon: IconDashboard, label: 'Dashboard', path: '/dashboard' }
      );
    }
  }

  // Lab user – conditional: Chemistry lab gets Bottle Inventory + Stock View
  if (hasRole('lab_user')) {
    const labType = user?.lab_type;
    if (labType === 'Chemistry') {
      menuItems.push(
        { icon: IconDashboard, label: 'My Lab', path: '/dashboard' },
        { icon: IconFlask, label: 'Bottle Inventory', path: '/bottles' },
        { icon: IconFlask, label: 'Stock View', path: '/stock' }
      );
    } else {
      menuItems.push(
        { icon: IconDashboard, label: 'My Lab', path: '/dashboard' },
        { icon: IconFlask, label: 'Stock View', path: '/stock' }
      );
    }
  }

  // ICT keeper (standalone, not admin)
  if (hasRole('ict_keeper') && !hasRole('admin')) {
    const ictPaths = ['/ict-dashboard', '/ict-hardware', '/ict-licenses', '/ict-assignments'];
    const existingPaths = menuItems.map(mi => mi.path);
    if (!existingPaths.some(p => ictPaths.includes(p))) {
      menuItems.push(
        { icon: IconDashboard, label: 'ICT Dashboard', path: '/ict-dashboard' },
        { icon: IconDeviceDesktop, label: 'Hardware', path: '/ict-hardware' },
        { icon: IconLicense, label: 'Licences', path: '/ict-licenses' }
      );
    }
  }

  return (
    <>
      <MantineAppShell
        header={{ height: 60 }}
        navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        padding="md"
      >
        <MantineAppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Burger opened={opened} onClick={() => setOpened(!opened)} size="sm" hiddenFrom="sm" />
              <Tooltip label="Go back">
                <ActionIcon variant="subtle" onClick={() => navigate(-1)}>
                  <IconArrowLeft size={20} />
                </ActionIcon>
              </Tooltip>
              <Image src="/logo.png" alt="NARDI" height={36} fit="contain" />
            </Group>
            <Group gap="xs">
              <Tooltip label="Dashboard">
                <ActionIcon variant="subtle" onClick={() => navigate('/dashboard')}>
                  <IconHome size={20} />
                </ActionIcon>
              </Tooltip>
              <AlertBell />
              {hasRole('lab_user') && (
                <Tooltip label="Change PIN">
                  <ActionIcon variant="subtle" onClick={() => setPinModal(true)}>
                    <IconKey size={20} />
                  </ActionIcon>
                </Tooltip>
              )}
              <Text size="sm">{user?.email}</Text>
            </Group>
          </Group>
        </MantineAppShell.Header>

        <MantineAppShell.Navbar p="md">
          <Stack justify="space-between" h="100%">
            <Box>
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  label={item.label}
                  leftSection={
                    <ThemeIcon size="md" variant="light">
                      <item.icon size={18} />
                    </ThemeIcon>
                  }
                  onClick={() => { navigate(item.path); setOpened(false); }}
                  styles={{ root: { borderRadius: 8 } }}
                />
              ))}
            </Box>
            <Box>
              <NavLink
                label="Logout"
                leftSection={
                  <ThemeIcon size="md" variant="light" color="red">
                    <IconLogout size={18} />
                  </ThemeIcon>
                }
                onClick={handleLogout}
                styles={{ root: { borderRadius: 8 } }}
              />
            </Box>
          </Stack>
        </MantineAppShell.Navbar>

        <MantineAppShell.Main>
          <Outlet />
        </MantineAppShell.Main>
      </MantineAppShell>

      {/* PIN Change Modal for lab_user */}
      <Modal
        opened={pinModal}
        onClose={() => {
          setPinModal(false);
          setNewPin('');
        }}
        title="Change Lab PIN"
        centered
      >
        <TextInput
          label="New 4-digit PIN"
          placeholder="Enter 4 digits"
          value={newPin}
          onChange={(e) => setNewPin(e.currentTarget.value)}
          maxLength={4}
          pattern="\d*"
          type="tel"
          autoComplete="off"
        />
        <Button fullWidth mt="md" onClick={handlePinChange}>
          Save
        </Button>
      </Modal>
    </>
  );
}