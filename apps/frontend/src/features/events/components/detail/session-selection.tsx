import { AlertCircle } from 'lucide-react';
import type { MovieSessionsByLocation } from '@elite-dev/shared';

import { cn } from '@/lib/utils';

interface SessionSelectionProps {
  sessionsByLocation: MovieSessionsByLocation[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

function formatSessionTime(date: string): string {
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SessionSelection({
  sessionsByLocation,
  selectedSessionId,
  onSelectSession,
}: SessionSelectionProps) {
  if (sessionsByLocation.length === 0) {
    return (
      <section className='flex flex-col gap-8 bg-paper px-5 py-20 md:px-20 md:py-20'>
        <h2 className='text-[24px] font-semibold text-ink'>
          Escolha sua sessão
        </h2>
        <div className='flex flex-col items-center gap-8 rounded-lg bg-surface px-16 py-24'>
          <div className='flex size-24 items-center justify-center rounded-full bg-paper'>
            <AlertCircle className='size-12 text-curtain' />
          </div>
          <div className='flex flex-col items-center gap-3'>
            <p className='text-[22px] font-semibold text-ink'>
              Não há sessões disponíveis neste momento
            </p>
            <p className='text-base text-muted-foreground'>
              Volte em outro momento ou escolha outro filme.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className='flex flex-col gap-8 bg-paper px-5 py-12 md:px-20'>
      <h2 className='text-[24px] font-semibold text-ink'>Escolha sua sessão</h2>

      <div className='flex flex-col gap-4'>
        {sessionsByLocation.map((group) => (
          <div
            key={group.location}
            className='flex flex-col gap-4 rounded-md border border-line bg-surface p-6 md:px-8'
          >
            <h3 className='text-[18px] font-semibold text-ink'>
              {group.location}
            </h3>
            <div className='flex flex-wrap gap-3'>
              {group.sessions.map((session) => {
                const isSelected = session.id === selectedSessionId;
                return (
                  <button
                    key={session.id}
                    type='button'
                    onClick={() => onSelectSession(session.id)}
                    className={cn(
                      'rounded-md border px-4 py-2.5 text-sm font-semibold transition-colors',
                      isSelected
                        ? 'border-curtain bg-curtain text-white'
                        : 'border-line bg-surface text-ink hover:border-line-strong',
                    )}
                  >
                    {formatSessionTime(session.date)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
