import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useLogin } from '@/features/auth/hooks/use-login';
import { loginSchema, type LoginFormData } from '@/features/auth/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toastError } from '@/lib/toast';

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const login = useLogin();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (data: LoginFormData) => {
    login.mutate(data, {
      onSuccess: () => {
        if (redirect) {
          window.location.href = redirect;
        } else {
          navigate({ to: '/' });
        }
      },
      onError: () => {
        toastError('Credenciais inválidas. Tente novamente.');
      },
    });
  };

  return (
    <div className='flex h-screen overflow-hidden bg-surface'>
      <div className='hidden lg:block lg:w-[700px] lg:flex-shrink-0'>
        <img
          src='https://images.unsplash.com/photo-1676063258992-1562bbecb583?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODcyMjgxOTh8&ixlib=rb-4.1.0&q=80&w=1080'
          alt=''
          className='h-full w-full object-cover'
        />
      </div>

      <div className='flex flex-1 items-center justify-center overflow-y-auto px-6 py-12 lg:px-20'>
        <div className='flex w-full max-w-[420px] flex-col gap-6'>
          <span className='text-[24px] font-bold text-ink'>guichê</span>

          <div className='flex flex-col gap-1'>
            <h1 className='text-[24px] font-bold text-ink'>Acesse sua conta</h1>
            <p className='text-[14px] text-muted-ink'>
              Bem-vindo de volta. Entre para continuar.
            </p>
          </div>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex flex-col gap-4'
          >
            <div className='flex flex-col gap-6'>
              <Label className='flex flex-col gap-2'>
                <span className='text-[13px] font-semibold text-ink'>
                  E-mail
                </span>
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
                <span className='text-[13px] font-semibold text-ink'>
                  Senha
                </span>
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

              <Button
                type='submit'
                disabled={login.isPending}
                className='h-12 w-full rounded-md bg-curtain text-[15px] font-semibold text-white hover:bg-curtain-hover'
              >
                {login.isPending ? 'Entrando...' : 'Entrar'}
              </Button>
            </div>

            <div className='flex items-center justify-center gap-1'>
              <span className='text-[14px] text-muted-ink'>
                Ainda não tem uma conta?
              </span>
              <Link
                to='/register'
                className='text-[14px] font-semibold text-curtain hover:underline'
              >
                Criar conta
              </Link>
            </div>
          </form>

          <div className='mt-8 flex flex-col items-center gap-2'>
            <p className='text-[12px] text-muted-ink'>© 2026 guichê</p>
          </div>
        </div>
      </div>
    </div>
  );
}
