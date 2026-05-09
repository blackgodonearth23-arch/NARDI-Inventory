import { useEffect, useState } from 'react';
import { ActionIcon, Indicator } from '@mantine/core';
import { IconBell } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function AlertBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/alerts');
      const unread = res.data.filter(a => !a.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <Indicator inline label={unreadCount || ''} size={16} disabled={unreadCount === 0}
               offset={4} withBorder>
      <ActionIcon variant="subtle" onClick={() => navigate('/alerts')}>
        <IconBell size={20} />
      </ActionIcon>
    </Indicator>
  );
}