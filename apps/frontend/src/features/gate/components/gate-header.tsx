import { ShieldCheck, User, LogOut } from 'lucide-react';

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

interface GateHeaderProps {
  className?: string;
}

export function GateHeader({ className }: GateHeaderProps) {
  const { data: user } = useGetMe();
  const logoutMutation = useLogout();

  return (
    <header
      className={cn(
        'flex h-14 items-center justify-between border-b border-line bg-surface px-4',
        className,
      )}
    >
      <span className='text-[20px] font-bold text-ink'>guichê</span>
      <div className='flex items-center gap-3'>
        <div className='flex items-center gap-2'>
          <ShieldCheck className='size-[18px] fill-[#9B2531]' />
          <span className='text-[13px] font-semibold text-[#9B2531]'>
            Portaria
          </span>
        </div>
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
  );
}
