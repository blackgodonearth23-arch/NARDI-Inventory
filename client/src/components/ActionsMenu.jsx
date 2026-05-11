import { Menu, ActionIcon } from '@mantine/core';
import { IconDotsVertical } from '@tabler/icons-react';

export default function ActionsMenu({ children }) {
  return (
    <Menu shadow="md" width={200} position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray">
          <IconDotsVertical size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {children}
      </Menu.Dropdown>
    </Menu>
  );
}