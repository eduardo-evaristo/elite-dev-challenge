import { useState, useEffect, type ReactNode } from 'react';
import { useSearch } from '@tanstack/react-router';
import { Armchair, Ticket, Trash2, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { maskCurrency } from '@/lib/masks';

type Format = 'seated' | 'standing';

interface Sector {
  name: string;
  price: string;
  capacity: string;
}

interface StepFormatProps {
  format: Format | undefined;
  rows: number | undefined;
  seatsPerRow: number | undefined;
  sectors: string | undefined;
  onFormatChange: (format: Format) => void;
  onSeatedConfigChange: (
    rows: number | undefined,
    seatsPerRow: number | undefined,
  ) => void;
  onSectorsChange: (sectors: string | undefined) => void;
}

const DEBOUNCE_MS = 500;
const MAX_PREVIEW_ROWS = 12;
const MAX_PREVIEW_SEATS = 24;

export function StepFormat({
  format,
  rows,
  seatsPerRow,
  sectors,
  onFormatChange,
  onSeatedConfigChange,
  onSectorsChange,
}: StepFormatProps) {
  const search = useSearch({ strict: false });
  const type = search.type as 'movie' | 'show' | undefined;
  const isMovie = type === 'movie';

  return (
    <>
      <h2 className='text-[22px] font-semibold text-ink'>Formato de venda</h2>
      <p className='text-sm text-muted-foreground'>
        Essa escolha é definitiva e não poderá ser alterada depois de publicado.
      </p>
      <div className='flex flex-col gap-5 md:flex-row md:items-start'>
        <FormatCard
          format='seated'
          isSelected={format === 'seated'}
          onSelect={onFormatChange}
          Icon={Armchair}
          title='Assento nomeado'
          desc='Cinema ou teatro com lugares numerados. Informe o template de fileiras e o sistema gera os assentos.'
        >
          {format === 'seated' && (
            <SeatedConfig
              rows={rows}
              seatsPerRow={seatsPerRow}
              onChange={onSeatedConfigChange}
            />
          )}
        </FormatCard>
        {!isMovie && (
          <FormatCard
            format='standing'
            isSelected={format === 'standing'}
            onSelect={onFormatChange}
            Icon={Ticket}
            title='Pista ou setores'
            desc='Shows e eventos com setores de pista. Monte a lista de tipos de ingresso abaixo.'
          >
            {format === 'standing' && (
              <StandingConfig sectors={sectors} onChange={onSectorsChange} />
            )}
          </FormatCard>
        )}
      </div>
    </>
  );
}

function FormatCard({
  format,
  isSelected,
  onSelect,
  Icon,
  title,
  desc,
  children,
}: {
  format: Format;
  isSelected: boolean;
  onSelect: (format: Format) => void;
  Icon: LucideIcon;
  title: string;
  desc: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col gap-4 rounded-md bg-surface px-7 py-6',
        isSelected ? 'border-2 border-curtain' : 'border border-line',
      )}
      onClick={() => onSelect(format)}
    >
      <button
        type='button'
        className='flex w-full items-center justify-between text-left'
      >
        <div className='flex items-center gap-3'>
          <Icon
            className={cn(
              'size-6',
              isSelected ? 'text-curtain' : 'text-muted-foreground',
            )}
          />
          <span className='text-base font-semibold text-ink'>{title}</span>
        </div>
        <RadioIndicator selected={isSelected} />
      </button>
      <p className='text-[13px] leading-relaxed text-muted-foreground'>
        {desc}
      </p>
      {children}
    </div>
  );
}

function RadioIndicator({ selected }: { selected: boolean }) {
  if (selected) {
    return (
      <div className='flex size-5 items-center justify-center rounded-full bg-curtain'>
        <div className='size-2 rounded-full bg-white' />
      </div>
    );
  }
  return <div className='size-5 rounded-full border-2 border-line' />;
}

function SeatedConfig({
  rows,
  seatsPerRow,
  onChange,
}: {
  rows: number | undefined;
  seatsPerRow: number | undefined;
  onChange: (rows: number | undefined, seatsPerRow: number | undefined) => void;
}) {
  const [rowsInput, setRowsInput] = useState(rows?.toString() ?? '');
  const [seatsInput, setSeatsInput] = useState(seatsPerRow?.toString() ?? '');

  const handleRowsChange = (value: string) => {
    setRowsInput(value);
    const num = value ? parseInt(value, 10) : undefined;
    onChange(num, seatsPerRow);
  };

  const handleSeatsChange = (value: string) => {
    setSeatsInput(value);
    const num = value ? parseInt(value, 10) : undefined;
    onChange(rows, num);
  };

  const totalSeats = (rows ?? 0) * (seatsPerRow ?? 0);
  const previewRows = Math.min(rows ?? 0, MAX_PREVIEW_ROWS);
  const previewSeats = Math.min(seatsPerRow ?? 0, MAX_PREVIEW_SEATS);
  const hasRowOverflow = (rows ?? 0) > MAX_PREVIEW_ROWS;
  const hasSeatOverflow = (seatsPerRow ?? 0) > MAX_PREVIEW_SEATS;

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3 md:flex-row md:gap-3'>
        <label className='flex flex-1 flex-col gap-2'>
          <span className='text-[13px] font-semibold text-ink'>
            Número de fileiras
          </span>
          <input
            type='number'
            min={1}
            max={50}
            value={rowsInput}
            onChange={(e) => handleRowsChange(e.target.value)}
            className='w-full rounded-md border border-line bg-surface px-3.5 py-3 text-sm text-ink outline-none focus:border-curtain'
          />
        </label>
        <label className='flex flex-1 flex-col gap-2'>
          <span className='text-[13px] font-semibold text-ink'>
            Assentos por fileira
          </span>
          <input
            type='number'
            min={1}
            max={30}
            value={seatsInput}
            onChange={(e) => handleSeatsChange(e.target.value)}
            className='w-full rounded-md border border-line bg-surface px-3.5 py-3 text-sm text-ink outline-none focus:border-curtain'
          />
        </label>
      </div>

      <div className='flex items-center justify-between rounded-md bg-paper px-4 py-3.5'>
        <span className='text-[13px] text-muted-foreground'>
          Capacidade total
        </span>
        <span className='text-sm font-semibold text-ink'>
          {totalSeats} assentos
        </span>
      </div>

      {totalSeats > 0 && (
        <>
          <span className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
            Prévia da sala
          </span>
          <div className='flex flex-col items-center gap-4 rounded-md border border-line bg-surface p-5'>
            <div className='flex h-7 w-[280px] items-center justify-center rounded bg-line'>
              <span className='text-[11px] font-semibold text-muted-foreground'>
                PALCO
              </span>
            </div>
            <div className='flex flex-col gap-1.5'>
              {Array.from({ length: previewRows }, (_, rowIdx) => (
                <div key={rowIdx} className='flex items-center gap-1'>
                  <span className='w-3 text-center text-[10px] font-semibold text-muted-foreground'>
                    {String.fromCharCode(65 + rowIdx)}
                  </span>
                  {Array.from({ length: previewSeats }, (_, seatIdx) => (
                    <div
                      key={seatIdx}
                      className='size-3.5 rounded-sm border border-line bg-paper'
                    />
                  ))}
                  {hasSeatOverflow && (
                    <span className='ml-1 text-[10px] text-muted-foreground'>
                      ...
                    </span>
                  )}
                </div>
              ))}
              {hasRowOverflow && (
                <span className='text-[10px] text-muted-foreground'>...</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StandingConfig({
  sectors,
  onChange,
}: {
  sectors: string | undefined;
  onChange: (sectors: string | undefined) => void;
}) {
  const [sectorList, setSectorList] = useState<Sector[]>(() => {
    const parsed = parseSectors(sectors);
    return parsed.length > 0 ? parsed : [{ name: '', price: '', capacity: '' }];
  });
  const debouncedSectors = useDebounce(sectorList, DEBOUNCE_MS);

  useEffect(() => {
    const json =
      debouncedSectors.length > 0
        ? JSON.stringify(debouncedSectors)
        : undefined;
    if (json !== sectors) {
      onChange(json);
    }
  }, [debouncedSectors, sectors, onChange]);

  const updateSector = (index: number, field: keyof Sector, value: string) => {
    setSectorList((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  };

  const addSector = () => {
    setSectorList((prev) => [...prev, { name: '', price: '', capacity: '' }]);
  };

  const removeSector = (index: number) => {
    setSectorList((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className='flex flex-col gap-3'>
      <div className='hidden items-center gap-4 md:flex'>
        <span className='flex-1 text-xs font-semibold text-muted-foreground'>
          Setor
        </span>
        <span className='w-35 text-xs font-semibold text-muted-foreground'>
          Preço
        </span>
        <span className='w-35 text-xs font-semibold text-muted-foreground'>
          Capacidade
        </span>
        <span className='w-[18px]' />
      </div>

      {sectorList.map((sector, index) => (
        <div
          key={index}
          className='flex flex-col gap-2 md:flex-row md:items-center md:gap-4'
        >
          <input
            type='text'
            value={sector.name}
            onChange={(e) => updateSector(index, 'name', e.target.value)}
            placeholder='Nome do setor'
            className='w-full flex-1 rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-curtain'
          />
          <input
            type='text'
            inputMode='decimal'
            value={sector.price}
            onChange={(e) =>
              updateSector(index, 'price', maskCurrency(e.target.value))
            }
            placeholder='R$ 0,00'
            className='w-full rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-curtain md:w-35'
          />
          <input
            type='text'
            inputMode='numeric'
            value={sector.capacity}
            onChange={(e) => updateSector(index, 'capacity', e.target.value)}
            placeholder='0'
            className='w-full rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-curtain md:w-35'
          />
          <button
            type='button'
            onClick={() => removeSector(index)}
            disabled={sectorList.length <= 1}
            className={cn(
              'rounded-md p-1 text-muted-foreground transition-colors',
              sectorList.length <= 1
                ? 'cursor-not-allowed opacity-30'
                : 'hover:text-curtain',
            )}
          >
            <Trash2 className='size-[18px]' />
          </button>
        </div>
      ))}

      <button
        type='button'
        onClick={addSector}
        className='flex items-center gap-2 self-start pt-2'
      >
        <Plus className='size-[18px] text-curtain' />
        <span className='text-sm font-semibold text-curtain'>
          Adicionar setor
        </span>
      </button>
    </div>
  );
}

function parseSectors(json: string | undefined): Sector[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed as Sector[];
  } catch {
    /* invalid JSON */
  }
  return [];
}

function useDebounce<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
