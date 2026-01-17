import {
  BarChart3,
  Bug,
  ClipboardCheck,
  IdCard,
  MapPin,
  Mic2,
  ShieldCheck,
  Terminal,
  UserCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Role = 'reporter' | 'moderator' | 'staff' | 'admin_service';
export type NavGroup = 'primary' | 'secondary' | 'dev';

export type AppNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
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
    icon: MapPin,
    description: 'Explore support rooms and sessions.',
    group: 'primary',
    roles: ['reporter', 'moderator', 'staff', 'admin_service'],
  },
  {
    title: 'Insights',
    href: '/insights',
    icon: BarChart3,
    description: 'Session metrics and analytics.',
    group: 'primary',
    roles: ['moderator', 'staff', 'admin_service'],
  },
  {
    title: 'Reporter dashboard',
    href: '/reporter',
    icon: UserCheck,
    description: 'Reporter status and guidance.',
    group: 'secondary',
    roles: ['reporter'],
  },
  {
    title: 'Moderator dashboard',
    href: '/moderator',
    icon: ShieldCheck,
    description: 'Session controls and approvals.',
    group: 'secondary',
    roles: ['moderator', 'staff', 'admin_service'],
  },
  {
    title: 'Who am I?',
    href: '/whoami',
    icon: IdCard,
    description: 'Session context and sign-out.',
    group: 'secondary',
    roles: ['reporter', 'moderator', 'staff', 'admin_service'],
  },
  {
    title: 'Debug',
    href: '/debug',
    icon: Bug,
    description: 'Database reachability.',
    group: 'dev',
    roles: ['moderator', 'staff', 'admin_service'],
    devOnly: true,
  },
  {
    title: 'Evals',
    href: '/evals',
    icon: ClipboardCheck,
    description: 'Latest evaluation summary.',
    group: 'dev',
    roles: ['staff', 'admin_service'],
    devOnly: true,
  },
  {
    title: 'Dev dialog',
    href: '/dev/dialog',
    icon: Terminal,
    description: 'Focus-trap accessibility demo.',
    group: 'dev',
    roles: ['staff', 'admin_service'],
    devOnly: true,
  },
  {
    title: 'Dev audio input',
    href: '/dev/audio-input',
    icon: Mic2,
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
