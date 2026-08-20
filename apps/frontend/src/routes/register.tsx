import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useRegister } from '@/features/auth/hooks/use-register';
import { registerSchema, type RegisterFormData } from '@/features/auth/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/register')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const register = useRegister();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', lastName: '', email: '', password: '' },
  });

  const onSubmit = (data: RegisterFormData) => {
    register.mutate(data, {
      onSuccess: () => navigate({ to: '/' }),
      onError: () => {
        form.setError('root', {
          message: 'Erro ao cadastrar. Verifique os dados.',
        });
      },
    });
  };

  return (
    <div className='flex h-screen overflow-hidden bg-surface'>
      <div className='hidden lg:block lg:w-[580px] lg:flex-shrink-0'>
        <img
          src='https://images.unsplash.com/photo-1488036106564-87ecb155bb15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODcyMjg0ODd8&ixlib=rb-4.1.0&q=80&w=1080'
          alt=''
          className='h-full w-full rounded-md object-cover'
        />
      </div>

      <div className='flex flex-1 items-center justify-center overflow-y-auto px-6 py-12 lg:px-16'>
        <div className='flex w-full max-w-[420px] flex-col gap-8'>
          <span className='text-[24px] font-bold text-ink'>guichê</span>

          <h1 className='text-[28px] font-semibold text-ink'>Crie sua conta</h1>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex flex-col gap-5'
          >
            {form.formState.errors.root && (
              <p className='text-sm text-red-500'>
                {form.formState.errors.root.message}
              </p>
            )}

            <div className='flex flex-col gap-4 sm:flex-row'>
              <Label className='flex flex-1 flex-col gap-2'>
                <span className='text-[13px] font-medium text-muted-ink'>
                  Nome
                </span>
                <Input placeholder='João' {...form.register('name')} />
                {form.formState.errors.name && (
                  <span className='text-xs text-red-500'>
                    {form.formState.errors.name.message}
                  </span>
                )}
              </Label>

              <Label className='flex flex-1 flex-col gap-2'>
                <span className='text-[13px] font-medium text-muted-ink'>
                  Sobrenome
                </span>
                <Input placeholder='Silva' {...form.register('lastName')} />
                {form.formState.errors.lastName && (
                  <span className='text-xs text-red-500'>
                    {form.formState.errors.lastName.message}
                  </span>
                )}
              </Label>
            </div>

            <Label className='flex flex-col gap-2'>
              <span className='text-[13px] font-medium text-muted-ink'>
                Email
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
              <span className='text-[13px] font-medium text-muted-ink'>
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
              disabled={register.isPending}
              className='h-12 w-full rounded-md bg-curtain text-[15px] font-semibold text-white hover:bg-curtain-hover'
            >
              {register.isPending ? 'Cadastrando...' : 'Criar conta'}
            </Button>
          </form>

          <Link
            to='/login'
            className='text-center text-[14px] text-curtain hover:underline'
          >
            Já tem conta? Entre
          </Link>
        </div>
      </div>
    </div>
  );
}
