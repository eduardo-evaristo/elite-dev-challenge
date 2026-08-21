import { useState } from 'react';
import { Menu, X, User, LogOut, Search } from 'lucide-react';
import { Link, useMatchRoute } from '@tanstack/react-router';

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

const NAV_LINKS = [
  { to: '/admin/usuarios' as string, label: 'Painel' },
  { to: '/admin/eventos' as string, label: 'Eventos' },
  { to: '/admin/relatorios' as string, label: 'Relatórios' },
];

export function AdminNavbar() {
  const { data: user } = useGetMe();
  const logoutMutation = useLogout();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const matchRoute = useMatchRoute();

  return (
    <>
      <header className='flex h-16 items-center justify-between bg-surface px-4 md:px-8'>
        <div className='flex items-center gap-6'>
          <button
            className='text-muted-foreground transition-colors hover:text-ink md:hidden'
            onClick={() => setDrawerOpen(true)}
            aria-label='Abrir menu'
          >
            <Menu className='size-5' />
          </button>

          <Link to='/' className='text-[22px] font-bold text-ink'>
            guichê
          </Link>

          <nav className='hidden items-center gap-6 md:flex'>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'text-sm font-medium transition-colors',
                  matchRoute({ to: link.to })
                    ? 'text-ink'
                    : 'text-muted-foreground hover:text-ink',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className='flex items-center gap-3'>
          <div className='hidden items-center gap-2 rounded-md bg-paper px-3 py-2 md:flex'>
            <Search className='size-4 text-muted-foreground' />
            <span className='text-sm text-muted-foreground'>Buscar...</span>
          </div>

          <Link
            to='/admin/usuarios/novo'
            className='hidden rounded-md bg-curtain px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-curtain-hover md:block'
          >
            Criar evento
          </Link>

          {user && (
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

            <nav className='mb-6 flex flex-col gap-3'>
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                    matchRoute({ to: link.to })
                      ? 'bg-curtain text-white'
                      : 'text-muted-foreground hover:text-ink',
                  )}
                  onClick={() => setDrawerOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

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
