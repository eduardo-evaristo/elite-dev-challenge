import { createFileRoute, redirect } from '@tanstack/react-router';

import { meQueryOptions } from '@/features/auth/queries';

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions);
    if (!user || user.role !== 'ADMIN') {
      throw redirect({ to: '/' });
    }
    if (location.pathname === '/admin') {
      throw redirect({ to: '/admin/usuarios' });
    }
  },
  component: () => null,
});
