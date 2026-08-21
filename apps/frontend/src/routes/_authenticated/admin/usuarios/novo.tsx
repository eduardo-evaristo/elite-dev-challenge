import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { meQueryOptions } from '@/features/auth/queries';
import { AdminNavbar } from '@/components/admin-navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateUserByAdmin } from '@/features/users/hooks/use-users';
import { toastSuccess, toastError } from '@/lib/toast';

const createUserSchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  lastName: z.string().min(1, 'Informe o sobrenome'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  role: z.enum(['CLIENT', 'ORGANIZER', 'GATE', 'ADMIN'], {
    message: 'Selecione uma função',
  }),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export const Route = createFileRoute('/_authenticated/admin/usuarios/novo')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions);
    if (!user || user.role !== 'ADMIN') {
      throw redirect({ to: '/' });
    }
  },
  component: CreateUserComponent,
});

const ROLE_OPTIONS = [
  { value: 'CLIENT' as const, label: 'Cliente' },
  { value: 'ORGANIZER' as const, label: 'Organizador' },
  { value: 'GATE' as const, label: 'Portaria' },
  { value: 'ADMIN' as const, label: 'Administrador' },
];

function CreateUserComponent() {
  const navigate = useNavigate();
  const createUser = useCreateUserByAdmin();

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      lastName: '',
      email: '',
      password: '',
      role: undefined,
    },
  });

  const onSubmit = (data: CreateUserFormData) => {
    createUser.mutate(data, {
      onSuccess: () => {
        toastSuccess('Usuário criado com sucesso.');
        navigate({ to: '/admin/usuarios' });
      },
      onError: (error) => {
        const err = error as {
          response?: { data?: { message?: string } };
        };
        const message =
          err?.response?.data?.message || 'Erro ao criar usuário.';
        toastError(message);
      },
    });
  };

  return (
    <div className='flex min-h-screen flex-col bg-paper font-sans'>
      <AdminNavbar />
      <main className='flex flex-1 flex-col gap-6 px-6 py-10 md:px-20'>
        <div>
          <h1 className='text-[28px] font-bold text-ink font-sans'>
            Criar usuário
          </h1>
          <p className='text-sm text-muted-foreground font-sans'>
            Preencha os dados para criar um novo usuário
          </p>
        </div>

        <div className='max-w-[560px] rounded-md border border-line bg-surface p-8'>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex flex-col gap-5'
          >
            <div className='grid grid-cols-2 gap-4'>
              <Label className='flex flex-col gap-2'>
                <span className='text-[13px] font-semibold text-ink'>Nome</span>
                <Input placeholder='Nome' {...form.register('name')} />
                {form.formState.errors.name && (
                  <span className='text-xs text-red-500'>
                    {form.formState.errors.name.message}
                  </span>
                )}
              </Label>

              <Label className='flex flex-col gap-2'>
                <span className='text-[13px] font-semibold text-ink'>
                  Sobrenome
                </span>
                <Input placeholder='Sobrenome' {...form.register('lastName')} />
                {form.formState.errors.lastName && (
                  <span className='text-xs text-red-500'>
                    {form.formState.errors.lastName.message}
                  </span>
                )}
              </Label>
            </div>

            <Label className='flex flex-col gap-2'>
              <span className='text-[13px] font-semibold text-ink'>E-mail</span>
              <Input
                type='email'
                placeholder='seu@email.com'
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <span className='text-xs text-red-500'>
                  {form.formState.errors.email.message}
                </span>
              )}
            </Label>

            <Label className='flex flex-col gap-2'>
              <span className='text-[13px] font-semibold text-ink'>Senha</span>
              <Input
                type='password'
                placeholder='••••••••'
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <span className='text-xs text-red-500'>
                  {form.formState.errors.password.message}
                </span>
              )}
            </Label>

            <Label className='flex flex-col gap-2'>
              <span className='text-[13px] font-semibold text-ink'>Função</span>
              <select
                className='flex h-12 w-full rounded-md border border-line bg-surface px-3.5 py-3 text-sm text-ink transition-colors outline-none focus:border-curtain disabled:cursor-not-allowed disabled:opacity-50 font-sans'
                {...form.register('role')}
              >
                <option value=''>Selecione...</option>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {form.formState.errors.role && (
                <span className='text-xs text-red-500'>
                  {form.formState.errors.role.message}
                </span>
              )}
            </Label>

            <div className='mt-2 flex items-center gap-3'>
              <Button
                type='submit'
                disabled={createUser.isPending}
                className='font-sans'
              >
                {createUser.isPending ? 'Criando...' : 'Criar usuário'}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => navigate({ to: '/admin/usuarios' })}
                className='font-sans'
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
