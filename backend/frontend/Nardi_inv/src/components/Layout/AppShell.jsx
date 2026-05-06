import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppShell as MantineAppShell,
  Burger,
  Group,
  Text,
  ThemeIcon,
  NavLink,
  Stack,
  Box
} from '@mantine/core';
import {
  IconLogout,
  IconBuildingWarehouse,
  IconFlask,
  IconUsers,
  IconDashboard,
  IconLicense,
  IconDeviceDesktop
} from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import { IconBell } from '@tabler/icons-react';
import AlertBell from '../AlertBell';
import { IconReport } from '@tabler/icons-react';

export default function AppShell() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [opened, setOpened] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [];

  if (hasRole('admin')) {
    menuItems.push(
      { icon: IconDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: IconUsers, label: 'User Management', path: '/users' },
      { icon: IconBuildingWarehouse, label: 'Labs & Locations', path: '/labs' },
      { icon: IconFlask, label: 'Chemical Inventory', path: '/chemicals' },
      { icon: IconReport, label: 'Reports', path: '/reports' }
    );
  }

  if (hasRole('lab_keeper')) {
    menuItems.push(
      { icon: IconDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: IconFlask, label: 'Inventory', path: '/chemicals' },
      { icon: IconBuildingWarehouse, label: 'Equipment', path: '/equipment' },
      { icon: IconBuildingWarehouse, label: 'Utensils', path: '/utensils' },
      { icon: IconBuildingWarehouse, label: 'Transfers', path: '/transfers' }
    );
  }

  if (hasRole('lab_user')) {
    menuItems.push(
      { icon: IconDashboard, label: 'My Lab', path: '/dashboard' },
      { icon: IconFlask, label: 'Stock View', path: '/stock' }
    );
  }

  if (hasRole('ict_keeper') || hasRole('admin')) {
    menuItems.push(
      { icon: IconDashboard, label: 'ICT Dashboard', path: '/ict-dashboard' },
      { icon: IconDeviceDesktop, label: 'Hardware', path: '/ict-hardware' },
      { icon: IconLicense, label: 'Licences', path: '/ict-licenses' }
    );
  }

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened }
      }}
      padding="md"
    >
      <MantineAppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={() => setOpened(!opened)} size="sm" hiddenFrom="sm" />
          <Text fw={700} size="lg">NARDI Inventory</Text>
          <Group ml="auto" spacing="xs">
  <NavLink
    label=""
    leftSection={
      <ThemeIcon size="md" variant="subtle" color="gray">
        <IconBell size={18} />
      </ThemeIcon>
    }
    onClick={() => navigate('/alerts')}
    styles={{ root: { padding: 0 } }}
  />
 <Group ml="auto" spacing="sm">
  <AlertBell />
  <Text size="sm">{user?.email}</Text>
</Group>
</Group>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="md">
        <Stack>
          <Box flex={1}>
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
  );
}