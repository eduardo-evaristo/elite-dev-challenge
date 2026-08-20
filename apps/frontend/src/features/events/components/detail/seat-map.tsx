import type { SeatResponse } from '@elite-dev/shared';

import { cn } from '@/lib/utils';

interface SeatMapProps {
  seats: SeatResponse[];
  selectedIds: string | null;
  onToggleSeat: (seatId: string) => void;
}

function groupSeatsByRow(seats: SeatResponse[]): {
  row: string;
  seats: SeatResponse[];
}[] {
  const map = new Map<string, SeatResponse[]>();
  for (const seat of seats) {
    const existing = map.get(seat.row);
    if (existing) {
      existing.push(seat);
    } else {
      map.set(seat.row, [seat]);
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([row, rowSeats]) => ({
      row,
      seats: rowSeats.sort((a, b) => a.number - b.number),
    }));
}

export function SeatMap({ seats, selectedIds, onToggleSeat }: SeatMapProps) {
  const rows = groupSeatsByRow(seats);

  return (
    <div className='flex flex-col items-center gap-8'>
      <div className='flex w-full max-w-[600px] items-center justify-center rounded-md bg-line py-2.5'>
        <span className='text-xs font-semibold tracking-wide text-muted-foreground'>
          PALCO
        </span>
      </div>

      <div className='flex flex-col gap-2'>
        {rows.map((row) => (
          <div key={row.row} className='flex items-center gap-1'>
            <span className='w-2 text-center text-[11px] font-normal text-muted-foreground'>
              {row.row}
            </span>
            <div className='flex gap-1'>
              {row.seats.map((seat) => {
                const isSelected = selectedIds === seat.id;
                const isSold = seat.status === 'SOLD';
                const isReserved = seat.status === 'RESERVED';
                const isUnavailable = isSold || isReserved;

                return (
                  <button
                    key={seat.id}
                    type='button'
                    disabled={isUnavailable}
                    onClick={() => onToggleSeat(seat.id)}
                    title={`${seat.row}-${seat.number}`}
                    className={cn(
                      'size-7 rounded border text-[10px] font-medium transition-colors',
                      isSelected
                        ? 'border-curtain bg-curtain text-white'
                        : isUnavailable
                          ? 'border-line bg-line text-muted-foreground'
                          : 'border-line bg-surface text-muted-foreground hover:border-line-strong',
                    )}
                  >
                    {seat.number}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className='flex flex-wrap items-center gap-8'>
        <div className='flex items-center gap-1'>
          <div className='size-3 rounded border border-line bg-surface' />
          <span className='text-[11px] text-muted-foreground'>Disponível</span>
        </div>
        <div className='flex items-center gap-1'>
          <div className='size-3 rounded border border-line bg-line' />
          <span className='text-[11px] text-muted-foreground'>Ocupado</span>
        </div>
        <div className='flex items-center gap-1'>
          <div className='size-3 rounded border border-curtain bg-curtain' />
          <span className='text-[11px] text-muted-foreground'>Selecionado</span>
        </div>
      </div>
    </div>
  );
}
