export function Footer() {
  return (
    <footer className='flex flex-col gap-6 bg-surface px-6 py-8 md:gap-8 md:px-20 md:py-12'>
      <div className='flex flex-col gap-2 md:w-[240px]'>
        <span className='text-[22px] font-bold text-ink'>guichê</span>
        <p className='text-sm text-muted-foreground md:w-[200px]'>
          Descubra eventos e filmes perto de você.
        </p>
      </div>

      <div className='h-px bg-line' />

      <div className='flex items-center justify-between'>
        <p className='text-xs text-muted-foreground'>
          © 2026 Guichê. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
