import { Search, MapPin, User } from 'lucide-react';
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

export function Navbar() {
  const { data: user } = useGetMe();
  const role = user?.role ?? null;

  const links = role === 'ORGANIZER' ? organizerLinks : clientLinks;
  const searchPlaceholder =
    role === 'ORGANIZER' ? 'Buscar...' : 'Buscar eventos, filmes...';

  return (
    <header className='flex h-16 items-center justify-between bg-surface px-8'>
      <nav className='flex items-center gap-6'>
        <span className='text-[22px] font-bold text-ink'>guichê</span>
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

      <div className='flex items-center gap-4'>
        <div className='flex items-center gap-1 rounded-md bg-paper px-3 py-2'>
          <Search className='size-4 text-muted-foreground' />
          <input
            type='text'
            placeholder={searchPlaceholder}
            className='bg-transparent text-[13px] text-muted-foreground placeholder:text-muted-foreground focus:outline-none'
          />
        </div>

        <div className='flex items-center gap-1 rounded-md bg-paper px-3 py-2'>
          <MapPin className='size-4 text-muted-foreground' />
          <span className='text-[13px] text-muted-foreground'>
            São Paulo, SP
          </span>
        </div>

        {role === 'CLIENT' && (
          <button
            className={cn(
              'rounded-md bg-curtain px-4 py-2 text-sm font-semibold text-white',
              'transition-colors hover:bg-curtain-hover',
            )}
          >
            Meus ingressos
          </button>
        )}

        {role === 'ORGANIZER' && (
          <button
            className={cn(
              'rounded-md bg-curtain px-4 py-2 text-sm font-semibold text-white',
              'transition-colors hover:bg-curtain-hover',
            )}
          >
            Criar evento
          </button>
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
  );
}
