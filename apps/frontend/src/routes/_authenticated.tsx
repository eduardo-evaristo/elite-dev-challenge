import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';

import { meQueryOptions } from '@/features/auth/queries';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions);
    if (!user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }
    if (user.role === 'GATE' && !location.pathname.startsWith('/portaria')) {
      throw redirect({ to: '/portaria' });
    }
  },
  component: () => <Outlet />,
});
