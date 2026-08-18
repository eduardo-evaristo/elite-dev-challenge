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

  const selectedType = useWatch({ control: form.control, name: 'type' });
  const scrollRef = useRef<HTMLDivElement>(null);

  const isStep1 = search.step === 1;
  const isStep2 = search.step === 2;

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
          className='flex flex-1 flex-col gap-6 overflow-y-auto px-20 py-12'
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
        ) : (
          <WizardFooter onBack={onBack} continueDisabled />
        )}
      </form>
    </div>
  );
}
