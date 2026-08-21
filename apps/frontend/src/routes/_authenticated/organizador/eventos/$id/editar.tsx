import { useEffect } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';

import { meQueryOptions } from '@/features/auth/queries';
import { eventForEditOptions } from '@/features/events/queries';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEventForEdit } from '@/features/events/hooks/use-my-events';
import { useUpdateEvent } from '@/features/events/hooks/use-update-event';
import { combineDateAndTime } from '@/lib/datetime';
import { maskCurrency } from '@/lib/masks';
import { toastError, toastSuccess } from '@/lib/toast';

const editEventSchema = z.object({
  date: z.string().min(1, 'Data é obrigatória'),
  time: z.string().min(1, 'Horário é obrigatório'),
  location: z.string().min(1, 'Local é obrigatório'),
  ticketPrice: z.string().min(1, 'Preço é obrigatório'),
  description: z.string().optional(),
});

type EditEventData = z.infer<typeof editEventSchema>;

export const Route = createFileRoute(
  '/_authenticated/organizador/eventos/$id/editar',
)({
  beforeLoad: async ({ context, params }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions);
    if (!user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')) {
      throw redirect({ to: '/' });
    }
    await context.queryClient.ensureQueryData(eventForEditOptions(params.id));
  },
  component: EditEventComponent,
});

function EditEventComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEventForEdit(id);
  const updateEvent = useUpdateEvent();

  const form = useForm<EditEventData>({
    resolver: zodResolver(editEventSchema),
    defaultValues: {
      date: '',
      time: '',
      location: '',
      ticketPrice: '',
      description: '',
    },
  });

  useEffect(() => {
    if (event) {
      const d = new Date(event.date);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const price =
        event.ticketTypes.length > 0
          ? `R$ ${event.ticketTypes[0].price.toFixed(2).replace('.', ',')}`
          : '';

      form.reset({
        date: dateStr,
        time: timeStr,
        location: event.location,
        ticketPrice: price,
        description: event.description ?? '',
      });
    }
  }, [event, form]);

  const buildPayload = (data: EditEventData) => {
    const dateISO = combineDateAndTime(data.date, data.time);
    const parsedPrice = parseFloat(
      data.ticketPrice.replace(/[^\d,]/g, '').replace(',', '.'),
    );

    const ticketTypes =
      event?.ticketTypes && event.ticketTypes.length > 0
        ? event.ticketTypes.map((tt) => ({
            name: tt.name,
            price: isNaN(parsedPrice) ? tt.price : parsedPrice,
            capacity: tt.capacity,
          }))
        : undefined;

    return {
      date: dateISO,
      location: data.location,
      description: data.description || undefined,
      ...(ticketTypes && { ticketTypes }),
    };
  };

  const onSubmit = form.handleSubmit((data) => {
    updateEvent.mutate(
      { id, data: buildPayload(data) },
      {
        onSuccess: () => {
          toastSuccess('Evento salvo com sucesso!');
          navigate({ to: '/organizador/eventos' });
        },
        onError: (error) => {
          const message = isAxiosError(error)
            ? (error.response?.data as { message?: string })?.message
            : undefined;
          toastError(message ?? 'Erro ao salvar. Tente novamente.');
        },
      },
    );
  });

  const onPublish = form.handleSubmit((data) => {
    updateEvent.mutate(
      { id, data: { ...buildPayload(data), status: 'PUBLISHED' } },
      {
        onSuccess: () => {
          toastSuccess('Evento publicado com sucesso!');
          navigate({ to: '/organizador/eventos' });
        },
        onError: (error) => {
          const message = isAxiosError(error)
            ? (error.response?.data as { message?: string })?.message
            : undefined;
          toastError(message ?? 'Erro ao publicar. Tente novamente.');
        },
      },
    );
  });

  if (isLoading || !event) {
    return (
      <div className='flex min-h-screen flex-col bg-paper font-sans'>
        <Navbar />
        <div className='flex flex-1 items-center justify-center'>
          <div className='h-8 w-48 animate-pulse rounded bg-line' />
        </div>
      </div>
    );
  }

  const isDraft = event.status === 'DRAFT';

  return (
    <div className='flex min-h-screen flex-col bg-paper font-sans'>
      <Navbar />
      <div className='flex flex-1 flex-col'>
        <div className='flex flex-1 flex-col gap-6 px-6 py-12 md:px-20'>
          <div>
            <h1 className='text-[22px] font-semibold text-ink font-sans'>
              Editar {event.name}
            </h1>
            <p className='mt-1 text-sm text-muted-foreground font-sans'>
              Ajuste os detalhes do seu evento. O tipo e o item do catálogo não
              podem ser alterados.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className='flex flex-1 flex-col justify-between'
          >
            <div className='flex flex-col gap-5'>
              <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                <div className='flex flex-col gap-2'>
                  <Label className='text-[13px] font-semibold text-ink font-sans'>
                    Data
                  </Label>
                  <DatePicker
                    // eslint-disable-next-line react-hooks/incompatible-library
                    value={form.watch('date')}
                    onValueChange={(v) => form.setValue('date', v)}
                    placeholder='Selecione a data'
                  />
                  {form.formState.errors.date && (
                    <p className='text-xs text-curtain font-sans'>
                      {form.formState.errors.date.message}
                    </p>
                  )}
                </div>
                <div className='flex flex-col gap-2'>
                  <Label className='text-[13px] font-semibold text-ink font-sans'>
                    Horário
                  </Label>
                  <Input
                    type='time'
                    {...form.register('time')}
                    className='h-12 border-line bg-surface text-ink font-sans'
                  />
                  {form.formState.errors.time && (
                    <p className='text-xs text-curtain font-sans'>
                      {form.formState.errors.time.message}
                    </p>
                  )}
                </div>
              </div>

              <div className='flex flex-col gap-2'>
                <Label className='text-[13px] font-semibold text-ink font-sans'>
                  Local
                </Label>
                <Input
                  {...form.register('location')}
                  className='h-12 border-line bg-surface text-ink font-sans'
                  placeholder='Ex: Cinemark Shopping Eldorado'
                />
                {form.formState.errors.location && (
                  <p className='text-xs text-curtain font-sans'>
                    {form.formState.errors.location.message}
                  </p>
                )}
              </div>

              <div className='flex flex-col gap-2'>
                <Label className='text-[13px] font-semibold text-ink font-sans'>
                  Preço do ingresso
                </Label>
                <Input
                  inputMode='decimal'
                  value={form.watch('ticketPrice')}
                  onChange={(e) =>
                    form.setValue('ticketPrice', maskCurrency(e.target.value))
                  }
                  className='h-12 border-line bg-surface text-ink font-sans'
                  placeholder='R$ 0,00'
                />
                {form.formState.errors.ticketPrice && (
                  <p className='text-xs text-curtain font-sans'>
                    {form.formState.errors.ticketPrice.message}
                  </p>
                )}
              </div>

              <div className='flex flex-col gap-2'>
                <Label className='text-[13px] font-semibold text-ink font-sans'>
                  Descrição (opcional)
                </Label>
                <textarea
                  {...form.register('description')}
                  rows={4}
                  className='rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink font-sans outline-none transition-colors focus:border-curtain'
                  placeholder='Descreva seu evento...'
                />
              </div>
            </div>

            <div className='mt-8 flex items-center justify-end gap-3 py-4'>
              {isDraft && (
                <Button
                  type='button'
                  variant='outline'
                  disabled={updateEvent.isPending}
                  onClick={onPublish}
                  className='font-sans'
                >
                  {updateEvent.isPending ? 'Publicando...' : 'Publicar'}
                </Button>
              )}
              <Button
                type='submit'
                disabled={updateEvent.isPending}
                className='min-w-[160px] font-sans'
              >
                {updateEvent.isPending ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
