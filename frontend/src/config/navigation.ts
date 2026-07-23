export const navigationItems = [
  { path: '/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: '📊' },
  { path: '/review', label: 'Spaced Review', shortLabel: 'Review', icon: '🧠' },
  { path: '/games', label: 'Learn & Play', shortLabel: 'Play', icon: '🎮' },
  { path: '/career', label: 'Career Path', shortLabel: 'Career', icon: '🚀' },
  { path: '/tutors', label: 'Peer Tutors', shortLabel: 'Tutors', icon: '👥' },
  { path: '/groups', label: 'Study Groups', shortLabel: 'Groups', icon: '📚' },
  { path: '/accessibility', label: 'Accessibility', shortLabel: 'Access', icon: '♿' },
] as const;

export const adminNavigationItem = { path: '/admin', label: 'Admin Panel', shortLabel: 'Admin', icon: '⚙️' } as const;
