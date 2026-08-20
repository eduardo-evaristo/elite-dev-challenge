import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  expiresAt: string;
  onExpired: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function CountdownTimer({ expiresAt, onExpired }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => {
    const diff = Math.floor(
      (new Date(expiresAt).getTime() - Date.now()) / 1000,
    );
    return Math.max(0, diff);
  });

  useEffect(() => {
    if (remaining <= 0) {
      onExpired();
      return;
    }

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remaining, onExpired]);

  const minutes = Math.floor(remaining / 60);

  const colorClass =
    remaining <= 120
      ? 'border-curtain/20 bg-curtain/10 text-curtain'
      : minutes <= 5
        ? 'border-spotlight/20 bg-spotlight/10 text-spotlight'
        : 'border-stage/20 bg-stage/10 text-stage';

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold',
        colorClass,
      )}
    >
      <Clock className='size-4' />
      <span>Reserva expira em {formatTime(remaining)}</span>
    </div>
  );
}
