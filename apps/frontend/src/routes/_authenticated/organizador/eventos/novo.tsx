import { useEffect } from 'react';
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

  const onContinue = form.handleSubmit((data) => {
    navigate({
      search: (prev) => ({ ...prev, step: 2, type: data.type }),
    });
  });

  const onBack = () => {
    if (search.step <= 1) {
      navigate({ to: '/' });
    } else {
      navigate({
        search: (prev) => ({ ...prev, step: prev.step - 1 }),
      });
    }
  };

  const selectedType = useWatch({ control: form.control, name: 'type' });

  return (
    <div className='flex min-h-screen flex-col bg-paper'>
      <Navbar />
      <form onSubmit={onContinue} className='flex flex-1 flex-col'>
        <WizardProgress step={search.step} />
        <div className='flex flex-1 flex-col gap-6 px-20 py-12'>
          {search.step === 1 && <StepType form={form} />}
        </div>
        <WizardFooter onBack={onBack} continueDisabled={!selectedType} />
      </form>
    </div>
  );
}
