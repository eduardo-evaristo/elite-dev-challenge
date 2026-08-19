import { useEffect, useRef, useState } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import type {
  CreateEventRequest,
  SeatRequest,
  TicketTypeRequest,
} from '@elite-dev/shared';

import { meQueryOptions } from '@/features/auth/queries';
import { catalogDetailOptions } from '@/features/catalog/queries';
import { Navbar } from '@/components/navbar';
import {
  eventCreateSearchSchema,
  step1Schema,
  type Step1Data,
} from '@/features/events/schemas';
import { WizardProgress } from '@/features/events/components/wizard-progress';
import { WizardFooter } from '@/features/events/components/wizard-footer';
import { StepType } from '@/features/events/components/step-type';
import { StepCatalog } from '@/features/events/components/step-catalog';
import { StepFormat } from '@/features/events/components/step-format';
import { StepDetails } from '@/features/events/components/step-details';
import { StepReview } from '@/features/events/components/step-review';
import { useCreateEvent } from '@/features/events/hooks/use-create-event';
import { combineDateAndTime } from '@/lib/datetime';

export const Route = createFileRoute(
  '/_authenticated/organizador/eventos/novo',
)({
  validateSearch: eventCreateSearchSchema,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions);
    if (!user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')) {
      throw redirect({ to: '/' });
    }
  },
  component: NovoEventoComponent,
});

function NovoEventoComponent() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { type: search.type },
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset({ type: search.type });
  }, [search.type, form]);

  const onContinueStep1 = form.handleSubmit((data) => {
    navigate({
      search: (prev) => ({ ...prev, step: 2, type: data.type }),
    });
  });

  const onContinueStep2 = () => {
    navigate({
      search: (prev) => ({ ...prev, step: 3 }),
    });
  };

  const onBack = () => {
    if (search.step <= 1) {
      navigate({ to: '/' });
    } else {
      navigate({
        search: (prev) => ({ ...prev, step: prev.step - 1 }),
      });
    }
  };

  const onQueryChange = (query: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        query: query || undefined,
        externalId: undefined,
      }),
    });
  };

  const onSelect = (externalId: string) => {
    navigate({
      search: (prev) => ({ ...prev, externalId }),
    });
  };

  const onContinueStep3 = () => {
    navigate({
      search: (prev) => ({ ...prev, step: 4 }),
    });
  };

  const onFormatChange = (format: 'seated' | 'standing') => {
    navigate({
      search: (prev) => ({
        ...prev,
        format,
        rows: format === 'seated' ? prev.rows : undefined,
        seatsPerRow: format === 'seated' ? prev.seatsPerRow : undefined,
        sectors: format === 'standing' ? prev.sectors : undefined,
      }),
    });
  };

  const onSeatedConfigChange = (
    rows: number | undefined,
    seatsPerRow: number | undefined,
  ) => {
    navigate({
      search: (prev) => ({ ...prev, rows, seatsPerRow }),
    });
  };

  const onSectorsChange = (sectors: string | undefined) => {
    navigate({
      search: (prev) => ({ ...prev, sectors }),
    });
  };

  const onContinueStep4 = () => {
    navigate({
      search: (prev) => ({ ...prev, step: 5 }),
    });
  };

  const onFieldChange = (
    field:
      | 'name'
      | 'date'
      | 'time'
      | 'duration'
      | 'location'
      | 'ticketPrice'
      | 'description'
      | 'classification',
    value: string | number | undefined,
  ) => {
    navigate({
      search: (prev) => ({ ...prev, [field]: value }),
    });
  };

  const selectedType = useWatch({ control: form.control, name: 'type' });
  const scrollRef = useRef<HTMLDivElement>(null);

  const isStep1 = search.step === 1;
  const isStep2 = search.step === 2;
  const isStep3 = search.step === 3;
  const isStep4 = search.step === 4;

  const detailQuery = useQuery(
    catalogDetailOptions(search.type ?? 'movie', search.externalId ?? ''),
  );

  const isStep3Valid = (() => {
    if (!search.format) return false;
    if (search.format === 'seated') {
      return (search.rows ?? 0) >= 1 && (search.seatsPerRow ?? 0) >= 1;
    }
    try {
      const parsed = search.sectors ? JSON.parse(search.sectors) : [];
      return (
        Array.isArray(parsed) &&
        parsed.some((s: { name?: string }) => s.name?.trim())
      );
    } catch {
      return false;
    }
  })();

  const isStep4Valid = (() => {
    if (!search.date || !search.time || !search.location) return false;
    if (!search.classification) return false;
    if (search.type === 'show' && !search.name?.trim()) return false;
    if (search.format === 'seated' && !search.ticketPrice?.trim()) return false;
    return true;
  })();

  const isStep5 = search.step === 5;

  const createEventMutation = useCreateEvent();
  const [, setSubmitError] = useState<string | null>(null);

  const buildPayload = (
    status: 'draft' | 'published' | undefined,
  ): CreateEventRequest | null => {
    if (!search.type || !search.classification || !search.duration) {
      return null;
    }
    const detail = detailQuery.data;
    const isMovie = search.type === 'movie';
    const isSeated = search.format === 'seated';
    const eventName = isMovie ? detail?.title : search.name;
    if (!eventName) return null;
    if (!search.date || !search.time || !search.location) return null;

    const dateISO = combineDateAndTime(search.date, search.time);

    const externalSource = isMovie ? 'TMDB' : 'TICKETMASTER';
    const imageUrl = detail?.posterUrl ?? undefined;

    let seats: SeatRequest[] | undefined;
    let ticketTypes: TicketTypeRequest[] | undefined;

    if (isSeated && search.rows && search.seatsPerRow) {
      const seatList: SeatRequest[] = [];
      for (let r = 0; r < search.rows; r++) {
        const rowLetter = String.fromCharCode(65 + r);
        for (let n = 1; n <= search.seatsPerRow; n++) {
          seatList.push({ row: rowLetter, number: n });
        }
      }
      seats = seatList;

      const parsedPrice = search.ticketPrice
        ? parseFloat(
            search.ticketPrice.replace(/[^\d,]/g, '').replace(',', '.'),
          )
        : 0;
      ticketTypes = [
        {
          name: 'Geral',
          price: parsedPrice,
          capacity: search.rows * search.seatsPerRow,
        },
      ];
    } else if (!isSeated && search.sectors) {
      try {
        const parsed = JSON.parse(search.sectors);
        if (Array.isArray(parsed)) {
          ticketTypes = parsed.map(
            (s: { name: string; price: string; capacity: string }) => ({
              name: s.name,
              price:
                parseFloat(s.price.replace(/[^\d,]/g, '').replace(',', '.')) ||
                0,
              capacity: parseInt(s.capacity, 10) || 0,
            }),
          );
        }
      } catch {
        return null;
      }
    }

    const payload: CreateEventRequest = {
      name: eventName,
      date: dateISO,
      location: search.location,
      type: search.type,
      externalId: search.externalId ?? '',
      externalSource,
      imageUrl,
      eventClassification: search.classification,
      description: search.description,
      duration: search.duration,
      seats,
      ticketTypes,
    };

    if (status) {
      payload.status = status;
    }

    return payload;
  };

  const onSubmitSuccess = () => {
    navigate({ to: '/' });
  };

  const onPublish = () => {
    setSubmitError(null);
    const payload = buildPayload(undefined);
    if (!payload) return;
    createEventMutation.mutate(payload, {
      onSuccess: onSubmitSuccess,
      onError: (error) => {
        const message = isAxiosError(error)
          ? (error.response?.data as { message?: string })?.message
          : undefined;
        setSubmitError(message ?? 'Erro ao publicar evento. Tente novamente.');
      },
    });
  };

  const onSaveDraft = () => {
    setSubmitError(null);
    const payload = buildPayload('draft');
    if (!payload) return;
    createEventMutation.mutate(payload, {
      onSuccess: onSubmitSuccess,
      onError: (error) => {
        const message = isAxiosError(error)
          ? (error.response?.data as { message?: string })?.message
          : undefined;
        setSubmitError(message ?? 'Erro ao salvar rascunho. Tente novamente.');
      },
    });
  };

  const isSubmitting = createEventMutation.isPending;

  return (
    <div className='flex h-screen flex-col overflow-hidden bg-paper'>
      <Navbar />
      <form
        onSubmit={isStep1 ? onContinueStep1 : undefined}
        className='flex flex-1 flex-col overflow-hidden'
      >
        <WizardProgress step={search.step} />
        <div
          ref={scrollRef}
          className='flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-8 md:px-20 md:py-12'
        >
          {isStep1 && <StepType form={form} />}
          {isStep2 && search.type && (
            <StepCatalog
              type={search.type}
              query={search.query}
              externalId={search.externalId}
              onQueryChange={onQueryChange}
              onSelect={onSelect}
              scrollRootRef={scrollRef}
            />
          )}
          {isStep3 && (
            <StepFormat
              format={search.format}
              rows={search.rows}
              seatsPerRow={search.seatsPerRow}
              sectors={search.sectors}
              onFormatChange={onFormatChange}
              onSeatedConfigChange={onSeatedConfigChange}
              onSectorsChange={onSectorsChange}
            />
          )}
          {isStep4 && search.type && (
            <StepDetails
              type={search.type}
              format={search.format}
              detail={detailQuery.data}
              name={search.name}
              date={search.date}
              time={search.time}
              duration={search.duration}
              location={search.location}
              ticketPrice={search.ticketPrice}
              description={search.description}
              classification={search.classification}
              onFieldChange={onFieldChange}
            />
          )}
          {isStep5 && search.type && (
            <StepReview
              type={search.type}
              format={search.format}
              detail={detailQuery.data}
              name={search.name}
              date={search.date}
              time={search.time}
              duration={search.duration}
              location={search.location}
              ticketPrice={search.ticketPrice}
              description={search.description}
              classification={search.classification}
              rows={search.rows}
              seatsPerRow={search.seatsPerRow}
              sectors={search.sectors}
            />
          )}
        </div>
        {isStep1 ? (
          <WizardFooter onBack={onBack} continueDisabled={!selectedType} />
        ) : isStep2 ? (
          <WizardFooter
            onBack={onBack}
            onContinue={onContinueStep2}
            continueDisabled={!search.externalId}
            continueType='button'
          />
        ) : isStep3 ? (
          <WizardFooter
            onBack={onBack}
            onContinue={onContinueStep3}
            continueDisabled={!isStep3Valid}
            continueType='button'
          />
        ) : isStep4 ? (
          <WizardFooter
            onBack={onBack}
            onContinue={onContinueStep4}
            continueDisabled={!isStep4Valid}
            continueType='button'
          />
        ) : isStep5 ? (
          <WizardFooter
            onBack={onBack}
            onContinue={onPublish}
            continueLabel='Publicar'
            continueType='button'
            onSecondaryAction={onSaveDraft}
            secondaryLabel='Salvar como rascunho'
            primaryLoading={isSubmitting}
            secondaryLoading={isSubmitting}
          />
        ) : (
          <WizardFooter onBack={onBack} continueDisabled />
        )}
      </form>
    </div>
  );
}
