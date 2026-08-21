import { useMemo, useState } from 'react';
import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { meQueryOptions } from '@/features/auth/queries';
import { AdminNavbar } from '@/components/admin-navbar';
import { Button } from '@/components/ui/button';
import { useUsersList, useDeleteUser } from '@/features/users/hooks/use-users';
import { toastSuccess, toastError } from '@/lib/toast';
import type { Role } from '@elite-dev/shared';

const usersSearchSchema = z.object({
  role: z.enum(['CLIENT', 'ORGANIZER', 'GATE', 'ADMIN']).optional(),
  page: z.number().min(1).default(1),
});

export const Route = createFileRoute('/_authenticated/admin/usuarios/')({
  validateSearch: usersSearchSchema,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions);
    if (!user || user.role !== 'ADMIN') {
      throw redirect({ to: '/' });
    }
  },
  component: AdminUsersComponent,
});

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  CLIENT: 'Cliente',
  ORGANIZER: 'Organizador',
  GATE: 'Portaria',
};

const ROLE_STYLES: Record<Role, string> = {
  ADMIN: 'bg-[#9B253114] text-[#9B2531]',
  CLIENT: 'bg-[#2E6B8414] text-[#2E6B84]',
  ORGANIZER: 'bg-[#B5741E14] text-[#B5741E]',
  GATE: 'bg-[#746B5E14] text-[#746B5E]',
};

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-medium font-sans ${ROLE_STYLES[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

function AdminUsersComponent() {
  const search = Route.useSearch();
  const deleteUser = useDeleteUser();

  const [filterRole, setFilterRole] = useState<Role | undefined>(
    () => search.role ?? undefined,
  );

  const { data, isLoading } = useUsersList({
    role: filterRole,
    page: search.page,
  });

  const users = useMemo(() => data?.items ?? [], [data]);

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Deseja excluir o usuário "${name}"?`)) return;
    deleteUser.mutate(id, {
      onSuccess: () => toastSuccess('Usuário excluído com sucesso.'),
      onError: () => toastError('Erro ao excluir usuário.'),
    });
  };

  return (
    <div className='flex min-h-screen flex-col bg-paper font-sans'>
      <AdminNavbar />
      <main className='flex flex-1 flex-col gap-6 px-6 py-10 md:px-20'>
        <div className='flex items-end justify-between'>
          <div>
            <h1 className='text-[28px] font-bold text-ink font-sans'>
              Usuários
            </h1>
            <p className='text-sm text-muted-foreground font-sans'>
              Gerencie usuários e permissões do sistema
            </p>
          </div>
          <Link to='/admin/usuarios/novo'>
            <Button className='gap-2 font-sans'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='18'
                height='18'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <path d='M5 12h14' />
                <path d='M12 5v14' />
              </svg>
              Criar usuário
            </Button>
          </Link>
        </div>

        <div className='flex gap-2'>
          {(
            [
              { value: undefined, label: 'Todos' },
              { value: 'CLIENT' as const, label: 'Clientes' },
              { value: 'ORGANIZER' as const, label: 'Organizadores' },
              { value: 'GATE' as const, label: 'Portaria' },
              { value: 'ADMIN' as const, label: 'Admins' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.label}
              onClick={() => setFilterRole(opt.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium font-sans transition-colors ${
                filterRole === opt.value
                  ? 'bg-curtain text-white'
                  : 'bg-surface text-muted-foreground hover:text-ink'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className='overflow-hidden rounded-md border border-line bg-surface'>
          <table className='w-full font-sans'>
            <thead>
              <tr className='bg-paper'>
                <th className='px-6 py-3.5 text-left text-xs font-semibold tracking-wide text-muted-foreground font-sans w-[240px]'>
                  Nome
                </th>
                <th className='px-6 py-3.5 text-left text-xs font-semibold tracking-wide text-muted-foreground font-sans'>
                  Email
                </th>
                <th className='px-6 py-3.5 text-left text-xs font-semibold tracking-wide text-muted-foreground font-sans w-[160px]'>
                  Função
                </th>
                <th className='px-6 py-3.5 text-left text-xs font-semibold tracking-wide text-muted-foreground font-sans w-[120px]'>
                  Status
                </th>
                <th className='px-6 py-3.5 text-right text-xs font-semibold tracking-wide text-muted-foreground font-sans w-[120px]' />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className='border-t border-line'>
                    <td className='px-6 py-4'>
                      <div className='h-4 w-40 animate-pulse rounded bg-paper' />
                    </td>
                    <td className='px-6 py-4'>
                      <div className='h-4 w-48 animate-pulse rounded bg-paper' />
                    </td>
                    <td className='px-6 py-4'>
                      <div className='h-6 w-24 animate-pulse rounded bg-paper' />
                    </td>
                    <td className='px-6 py-4'>
                      <div className='h-6 w-16 animate-pulse rounded bg-paper' />
                    </td>
                    <td className='px-6 py-4' />
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className='px-6 py-16 text-center'>
                    <div className='flex flex-col items-center gap-3'>
                      <p className='text-muted-foreground font-sans'>
                        Nenhum usuário encontrado.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className='border-t border-line'>
                    <td className='px-6 py-4 text-sm font-medium text-ink font-sans'>
                      {user.name} {user.lastName}
                    </td>
                    <td className='px-6 py-4 text-[13px] text-muted-foreground font-sans'>
                      {user.email}
                    </td>
                    <td className='px-6 py-4'>
                      <RoleBadge role={user.role} />
                    </td>
                    <td className='px-6 py-4'>
                      <span className='inline-flex items-center rounded bg-[#2F7A3D14] px-2.5 py-1 text-xs font-medium text-[#2F7A3D] font-sans'>
                        Ativo
                      </span>
                    </td>
                    <td className='px-6 py-4 text-right'>
                      <div className='flex items-center justify-end gap-3'>
                        <button className='text-sm font-semibold text-curtain hover:underline font-sans'>
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.name)}
                          className='text-sm font-semibold text-curtain hover:underline font-sans'
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
