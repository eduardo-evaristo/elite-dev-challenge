import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

function formatDateDisplay(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  return format(new Date(year, month - 1, day), 'dd/MM/yyyy', { locale: ptBR });
}

function parseToDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface DatePickerProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  value,
  onValueChange,
  placeholder = 'Selecione a data',
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseToDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type='button'
          className={cn(
            'flex h-12 w-full items-center rounded-md border border-[#D8D2C4] bg-white px-4 py-3 text-left text-sm text-[#221F1C] transition-colors outline-none focus:border-[#9B2531]',
            !selected && 'text-[#B9AFA0]',
            className,
          )}
        >
          <CalendarIcon className='mr-3 size-4 shrink-0 text-[#746B5E]' />
          <span className='flex-1 truncate font-["IBM_Plex_Sans",sans-serif]'>
            {selected ? formatDateDisplay(value) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className='w-auto rounded-md border border-[#D8D2C4] p-0 shadow-sm'
        align='start'
      >
        <Calendar
          mode='single'
          selected={selected}
          onSelect={(day) => {
            if (day) {
              onValueChange(dateToString(day));
            }
            setOpen(false);
          }}
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );
}
