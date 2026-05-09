import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import LabKeeperDashboard from './LabKeeperDashboard';
import LabUserDashboard from './LabUserDashboard';
import ICTDashboard from './ICTDashboard';
import { Center, Loader } from '@mantine/core';

export default function DashboardRouter() {
  const { user, loading } = useAuth();

  if (loading) return <Center><Loader /></Center>;
  if (!user) return null;

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'lab_keeper':
      return <LabKeeperDashboard />;
    case 'lab_user':
      return <LabUserDashboard />;
    case 'ict_keeper':
      return <ICTDashboard />;
    default:
      return <AdminDashboard />;
  }
}