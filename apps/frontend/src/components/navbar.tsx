import { useState } from 'react';
import { Menu, X, User, LogOut } from 'lucide-react';
import { Link } from '@tanstack/react-router';

import { useGetMe } from '@/features/auth/hooks/use-get-me';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Navbar() {
  const { data: user } = useGetMe();
  const logoutMutation = useLogout();
  const role = user?.role ?? null;
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className='flex h-16 items-center justify-between bg-surface px-4 md:px-8'>
        <div className='flex items-center gap-4'>
          <button
            className='text-muted-foreground transition-colors hover:text-ink md:hidden'
            onClick={() => setDrawerOpen(true)}
            aria-label='Abrir menu'
          >
            <Menu className='size-5' />
          </button>

          <Link to='/' className='text-[22px] font-bold text-ink'>guichê</Link>
        </div>

        <div className='flex items-center gap-3'>
          {role === 'CLIENT' && (
            <Link
              to='/meus-ingressos'
              className={cn(
                'hidden rounded-md bg-curtain px-4 py-2 text-sm font-semibold text-white md:block',
                'transition-colors hover:bg-curtain-hover',
              )}
            >
              Meus ingressos
            </Link>
          )}

          {role === 'ORGANIZER' && (
            <Link
              to='/organizador/eventos'
              className={cn(
                'hidden rounded-md bg-curtain px-4 py-2 text-sm font-semibold text-white md:block',
                'transition-colors hover:bg-curtain-hover',
              )}
            >
              Meus eventos
            </Link>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className='text-muted-foreground transition-colors hover:text-ink'>
                  <User className='size-5' />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuLabel>
                  {user.name} {user.lastName}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logoutMutation.mutate()}
                  className='text-destructive focus:text-destructive'
                >
                  <LogOut className='mr-2 size-4' />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className='flex items-center gap-1'>
              <Link
                to='/login'
                className='text-sm font-medium text-muted-foreground transition-colors hover:text-curtain'
              >
                Faça Login
              </Link>
              <span className='text-sm text-muted-foreground'>/</span>
              <Link
                to='/register'
                className='text-sm font-medium text-muted-foreground transition-colors hover:text-curtain'
              >
                Cadastre-se
              </Link>
            </div>
          )}
        </div>
      </header>

      {drawerOpen && (
        <div
          className='fixed inset-0 z-50 bg-black/50 md:hidden'
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className='fixed inset-y-0 left-0 z-50 w-[280px] bg-surface p-6'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='mb-6 flex items-center justify-between'>
              <span className='text-[22px] font-bold text-ink'>guichê</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className='text-muted-foreground transition-colors hover:text-ink'
                aria-label='Fechar menu'
              >
                <X className='size-5' />
              </button>
            </div>

            <div className='mb-6 h-px bg-line' />

            {role === 'CLIENT' && (
              <Link
                to='/meus-ingressos'
                className={cn(
                  'mb-4 block rounded-md bg-curtain px-4 py-2 text-center text-sm font-semibold text-white',
                  'transition-colors hover:bg-curtain-hover',
                )}
                onClick={() => setDrawerOpen(false)}
              >
                Meus ingressos
              </Link>
            )}

            {role === 'ORGANIZER' && (
              <Link
                to='/organizador/eventos'
                className={cn(
                  'mb-4 block rounded-md bg-curtain px-4 py-2 text-center text-sm font-semibold text-white',
                  'transition-colors hover:bg-curtain-hover',
                )}
                onClick={() => setDrawerOpen(false)}
              >
                Meus eventos
              </Link>
            )}

            {!user && (
              <div className='flex items-center gap-1'>
                <Link
                  to='/login'
                  className='text-sm font-medium text-muted-foreground transition-colors hover:text-curtain'
                  onClick={() => setDrawerOpen(false)}
                >
                  Faça Login
                </Link>
                <span className='text-sm text-muted-foreground'>/</span>
                <Link
                  to='/register'
                  className='text-sm font-medium text-muted-foreground transition-colors hover:text-curtain'
                  onClick={() => setDrawerOpen(false)}
                >
                  Cadastre-se
                </Link>
              </div>
            )}

            {user && (
              <button
                className='flex items-center gap-2 text-sm font-medium text-destructive transition-colors hover:text-destructive/80'
                onClick={() => {
                  setDrawerOpen(false);
                  logoutMutation.mutate();
                }}
              >
                <LogOut className='size-4' />
                Sair
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
