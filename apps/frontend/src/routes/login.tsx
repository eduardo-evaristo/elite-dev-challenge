import { useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { useLogin } from '@/features/auth/hooks/use-login';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const Route = createFileRoute('/login')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const login = useLogin();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    login.mutate(
      { email, password },
      {
        onSuccess: () => navigate({ to: '/' }),
        onError: (error) => {
          setErrorMsg('Credenciais inválidas');
          console.error(error);
        },
      },
    );
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-paper'>
      <form
        onSubmit={handleSubmit}
        className='flex w-full max-w-sm flex-col gap-4 rounded-lg border border-line bg-surface p-8'
      >
        <h1 className='text-xl font-bold text-ink'>Entrar</h1>

        {errorMsg && <p className='text-sm text-red-500'>{errorMsg}</p>}

        <label className='flex flex-col gap-1'>
          <span className='text-sm font-medium text-muted-foreground'>
            Email
          </span>
          <Input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className='flex flex-col gap-1'>
          <span className='text-sm font-medium text-muted-foreground'>
            Senha
          </span>
          <Input
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <Button type='submit' disabled={login.isPending}>
          {login.isPending ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </div>
  );
}
