import { ArrowLeft, CircleCheckBig, CircleX } from 'lucide-react';
import type { ValidateTicketResponse } from '@elite-dev/shared';

interface ValidationResultProps {
  result: ValidateTicketResponse;
  eventName: string;
  onNext: () => void;
  onBack: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ValidationResult({
  result,
  eventName,
  onNext,
  onBack,
}: ValidationResultProps) {
  const isSuccess = result.status === 'VALID';
  const bgColor = isSuccess ? 'bg-[#3F7A55]' : 'bg-[#9B2531]';
  const Icon = isSuccess ? CircleCheckBig : CircleX;

  let title: string;
  let subtitle: string;

  switch (result.status) {
    case 'VALID':
      title = 'Ingresso válido';
      subtitle = `${result.holderName} · ${result.ticketLabel}`;
      break;
    case 'ALREADY_USED':
      title = 'Ingresso já utilizado';
      subtitle = `Usado às ${formatTime(result.usedAt)}`;
      break;
    case 'INVALID':
      title = 'Ingresso inválido';
      subtitle = 'A assinatura não confere';
      break;
    case 'WRONG_EVENT':
      title = 'Este ingresso é de outro evento';
      subtitle = result.ticketEventName;
      break;
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col p-6 ${bgColor}`}>
      <header className='flex items-center justify-between'>
        <button type='button' onClick={onBack} className='text-white'>
          <ArrowLeft className='size-6' />
        </button>
        <span className='text-[13px] font-medium text-white/67'>
          {eventName}
        </span>
      </header>

      <div className='flex flex-1 flex-col items-center justify-center gap-5'>
        <Icon className='size-24 text-white' />
        <h1 className='text-center text-[28px] font-bold text-white'>
          {title}
        </h1>
        <p className='text-center text-[17px] text-white/80'>{subtitle}</p>
      </div>

      <button
        type='button'
        onClick={onNext}
        className='w-full rounded-md bg-white py-[18px] px-6 text-center text-[17px] font-semibold text-ink transition-colors hover:bg-muted cursor-pointer'
      >
        Validar próximo
      </button>
    </div>
  );
}
