export type Role = 'reporter' | 'moderator' | 'staff' | 'admin_service';
export type NavGroup = 'primary' | 'secondary' | 'dev';

// IMPORTANT: This must stay serializable because it is passed from Server Components to Client Components.
export type NavIcon =
  | 'map-pin'
  | 'bar-chart-3'
  | 'user-check'
  | 'shield-check'
  | 'id-card'
  | 'bug'
  | 'clipboard-check'
  | 'terminal'
  | 'mic-2';

export type AppNavItem = {
  title: string;
  href: string;
  icon: NavIcon;
  description?: string;
  roles?: Role[];
  group: NavGroup;
  devOnly?: boolean;
};

export const NAV_SECTION_ORDER: NavGroup[] = ['primary', 'secondary', 'dev'];

export const NAV_SECTION_LABELS: Record<NavGroup, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  dev: 'Development',
};

const NAV_ITEMS: AppNavItem[] = [
  {
    title: 'Rooms',
    href: '/rooms',
    icon: 'map-pin',
    description: 'Explore support rooms and sessions.',
    group: 'primary',
    roles: ['reporter', 'moderator', 'staff', 'admin_service'],
  },
  {
    title: 'Insights',
    href: '/insights',
    icon: 'bar-chart-3',
    description: 'Session metrics and analytics.',
    group: 'primary',
    roles: ['moderator', 'staff', 'admin_service'],
  },
  {
    title: 'Reporter dashboard',
    href: '/reporter',
    icon: 'user-check',
    description: 'Reporter status and guidance.',
    group: 'secondary',
    roles: ['reporter'],
  },
  {
    title: 'Moderator dashboard',
    href: '/moderator',
    icon: 'shield-check',
    description: 'Session controls and approvals.',
    group: 'secondary',
    roles: ['moderator', 'staff', 'admin_service'],
  },
  {
    title: 'Who am I?',
    href: '/whoami',
    icon: 'id-card',
    description: 'Session context and sign-out.',
    group: 'secondary',
    roles: ['reporter', 'moderator', 'staff', 'admin_service'],
  },
  {
    title: 'Debug',
    href: '/debug',
    icon: 'bug',
    description: 'Database reachability.',
    group: 'dev',
    roles: ['moderator', 'staff', 'admin_service'],
    devOnly: true,
  },
  {
    title: 'Evals',
    href: '/evals',
    icon: 'clipboard-check',
    description: 'Latest evaluation summary.',
    group: 'dev',
    roles: ['staff', 'admin_service'],
    devOnly: true,
  },
  {
    title: 'Dev dialog',
    href: '/dev/dialog',
    icon: 'terminal',
    description: 'Focus-trap accessibility demo.',
    group: 'dev',
    roles: ['staff', 'admin_service'],
    devOnly: true,
  },
  {
    title: 'Dev audio input',
    href: '/dev/audio-input',
    icon: 'mic-2',
    description: 'Voice input automation.',
    group: 'dev',
    roles: ['staff', 'admin_service'],
    devOnly: true,
  },
];

export function getNavItemsForRole(role: Role, includeDev: boolean) {
  return NAV_ITEMS.filter((item) => {
    if (item.devOnly && !includeDev) return false;
    if (!item.roles?.length) return true;

    return item.roles.includes(role);
  });
}
