// client/src/pages/DashboardRouter.jsx
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

  const { role, lab_type } = user;

  // Admin always sees the admin overview
  if (role === 'admin') return <AdminDashboard />;

  // Lab keeper – route to appropriate dashboard based on lab type
  if (role === 'lab_keeper') {
    if (lab_type === 'ICT') {
      return <ICTDashboard />;
    }
    // Chemistry, Other, or any other (fallback)
    return <LabKeeperDashboard />;
  }

  // Dedicated ICT keeper (without lab_keeper role) – shows ICT dashboard
  if (role === 'ict_keeper') return <ICTDashboard />;

  // Lab user – their simplified view
  if (role === 'lab_user') return <LabUserDashboard />;

  // Fallback (should not happen)
  return <AdminDashboard />;
}