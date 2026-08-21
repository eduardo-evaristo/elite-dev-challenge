import { ShieldAlert } from 'lucide-react';

export function OrgNotice() {
  return (
    <div className='flex w-full items-center gap-2 rounded-md border border-[#9B253140] bg-[#9B253108] px-4 py-3'>
      <ShieldAlert className='size-[18px] shrink-0 text-curtain' />
      <p className='text-[13px] leading-[1.4] text-curtain'>
        Organizadores não podem comprar ingressos. Acesse com uma conta de
        cliente para realizar compras.
      </p>
    </div>
  );
}
