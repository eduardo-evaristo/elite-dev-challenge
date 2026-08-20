import { useState } from 'react';
import { Search, Menu, X, User } from 'lucide-react';
import { Link } from '@tanstack/react-router';

import { useGetMe } from '@/features/auth/hooks/use-get-me';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const clientLinks = [
  { label: 'Filmes', href: '#' },
  { label: 'Eventos', href: '#' },
];

const organizerLinks = [
  { label: 'Painel', href: '#' },
  { label: 'Eventos', href: '#' },
  { label: 'Relatórios', href: '#' },
];

const gateLinks: { label: string; href: string }[] = [];

export function Navbar() {
  const { data: user } = useGetMe();
  const role = user?.role ?? null;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const links =
    role === 'ORGANIZER'
      ? organizerLinks
      : role === 'GATE'
        ? gateLinks
        : clientLinks;
  const searchPlaceholder =
    role === 'ORGANIZER' ? 'Buscar...' : 'Buscar eventos, filmes...';

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

          <span className='text-[22px] font-bold text-ink'>guichê</span>

          <nav className='hidden items-center gap-6 md:flex'>
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className='text-sm font-medium text-muted-foreground transition-colors hover:text-ink'
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className='flex items-center gap-3'>
          {searchOpen ? (
            <div className='flex items-center gap-1 rounded-md bg-paper px-3 py-2'>
              <Search className='size-4 text-muted-foreground' />
              <input
                type='text'
                placeholder={searchPlaceholder}
                autoFocus
                onBlur={() => setSearchOpen(false)}
                className='w-40 bg-transparent text-[13px] text-muted-foreground placeholder:text-muted-foreground focus:outline-none sm:w-60'
              />
              <button
                onClick={() => setSearchOpen(false)}
                className='text-muted-foreground hover:text-ink'
                aria-label='Fechar busca'
              >
                <X className='size-4' />
              </button>
            </div>
          ) : (
            <button
              className='text-muted-foreground transition-colors hover:text-ink lg:hidden'
              onClick={() => setSearchOpen(true)}
              aria-label='Buscar'
            >
              <Search className='size-5' />
            </button>
          )}

          <div className='hidden items-center gap-1 rounded-md bg-paper px-3 py-2 lg:flex'>
            <Search className='size-4 text-muted-foreground' />
            <input
              type='text'
              placeholder={searchPlaceholder}
              className='bg-transparent text-[13px] text-muted-foreground placeholder:text-muted-foreground focus:outline-none'
            />
          </div>

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
              to='/organizador/eventos/novo'
              search={{ step: 1 }}
              className={cn(
                'hidden rounded-md bg-curtain px-4 py-2 text-sm font-semibold text-white md:block',
                'transition-colors hover:bg-curtain-hover',
              )}
            >
              Criar evento
            </Link>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className='text-muted-foreground transition-colors hover:text-ink'>
                <User className='size-5' />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {user ? (
                <DropdownMenuLabel>
                  {user.name} {user.lastName}
                </DropdownMenuLabel>
              ) : (
                <>
                  <DropdownMenuLabel>Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to='/login'>Entrar</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to='/register'>Criar conta</Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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

            <div className='mb-6 flex items-center gap-1 rounded-md bg-paper px-3 py-2'>
              <Search className='size-4 text-muted-foreground' />
              <input
                type='text'
                placeholder={searchPlaceholder}
                className='w-full bg-transparent text-[13px] text-muted-foreground placeholder:text-muted-foreground focus:outline-none'
              />
            </div>

            <div className='mb-6 h-px bg-line' />

            <nav className='flex flex-col gap-4'>
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className='text-sm font-medium text-muted-foreground transition-colors hover:text-ink'
                  onClick={() => setDrawerOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className='my-6 h-px bg-line' />

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
                to='/organizador/eventos/novo'
                search={{ step: 1 }}
                className={cn(
                  'mb-4 block rounded-md bg-curtain px-4 py-2 text-center text-sm font-semibold text-white',
                  'transition-colors hover:bg-curtain-hover',
                )}
                onClick={() => setDrawerOpen(false)}
              >
                Criar evento
              </Link>
            )}

            {!user && (
              <div className='flex flex-col gap-3'>
                <Link
                  to='/login'
                  className='text-sm font-medium text-muted-foreground transition-colors hover:text-ink'
                  onClick={() => setDrawerOpen(false)}
                >
                  Entrar
                </Link>
                <Link
                  to='/register'
                  className='text-sm font-medium text-muted-foreground transition-colors hover:text-ink'
                  onClick={() => setDrawerOpen(false)}
                >
                  Criar conta
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
