import { useEffect, useRef } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { meQueryOptions } from '@/features/auth/queries';
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

  const selectedType = useWatch({ control: form.control, name: 'type' });
  const scrollRef = useRef<HTMLDivElement>(null);

  const isStep1 = search.step === 1;
  const isStep2 = search.step === 2;
  const isStep3 = search.step === 3;

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
        ) : (
          <WizardFooter onBack={onBack} continueDisabled />
        )}
      </form>
    </div>
  );
}
