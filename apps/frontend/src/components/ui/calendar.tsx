import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'w-fit bg-white p-5 font-["IBM_Plex_Sans",sans-serif]',
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString('default', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn(
          'relative flex flex-col gap-4 md:flex-row',
          defaultClassNames.months,
        ),
        month: cn('flex w-full flex-col gap-5', defaultClassNames.month),
        nav: cn(
          'absolute inset-x-0 top-0 flex w-full items-center justify-between',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-6 w-6 select-none p-0 text-[#746B5E] hover:text-[#221F1C] aria-disabled:opacity-50',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-6 w-6 select-none p-0 text-[#746B5E] hover:text-[#221F1C] aria-disabled:opacity-50',
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          'flex w-full items-center justify-center',
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          'flex w-full items-center justify-center gap-1.5 text-sm font-medium',
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          'has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-md border',
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          'bg-popover absolute inset-0 opacity-0',
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          'select-none text-base font-semibold text-[#221F1C]',
          captionLayout === 'label'
            ? ''
            : '[&>svg]:text-muted-foreground flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5',
          defaultClassNames.caption_label,
        ),
        month_grid: cn('w-full border-collapse', defaultClassNames.month_grid),
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'flex-1 select-none px-1 pb-3 text-center text-xs font-medium text-[#746B5E]',
          defaultClassNames.weekday,
        ),
        week: cn('flex w-full gap-1', defaultClassNames.week),
        week_number_header: cn(
          'w-10 select-none',
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          'select-none text-xs text-[#B9AFA0]',
          defaultClassNames.week_number,
        ),
        day: cn(
          'group/day relative h-11 w-full select-none p-0 text-center',
          defaultClassNames.day,
        ),
        range_start: cn(
          'rounded-md bg-[#9B2531]',
          defaultClassNames.range_start,
        ),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn('rounded-md bg-[#9B2531]', defaultClassNames.range_end),
        today: cn(
          'rounded-md border border-[#9B2531] text-[#221F1C] data-[selected=true]:border-none data-[selected=true]:rounded-md',
          defaultClassNames.today,
        ),
        outside: cn(
          'text-[#B9AFA0] aria-selected:text-[#B9AFA0]',
          defaultClassNames.outside,
        ),
        disabled: cn('text-[#B9AFA0] opacity-50', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot='calendar'
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return (
              <ChevronLeftIcon className={cn('size-5', className)} {...props} />
            );
          }

          if (orientation === 'right') {
            return (
              <ChevronRightIcon
                className={cn('size-5', className)}
                {...props}
              />
            );
          }

          return (
            <ChevronLeftIcon className={cn('size-5', className)} {...props} />
          );
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant='ghost'
      size='icon'
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        'h-11 w-full rounded-md p-0 font-["IBM_Plex_Sans",sans-serif] text-sm font-normal text-[#221F1C]',
        'hover:bg-[#F5F4F0]',
        'data-[selected-single=true]:bg-[#9B2531] data-[selected-single=true]:text-white data-[selected-single=true]:font-semibold',
        'data-[range-middle=true]:bg-[#9B2531]/20 data-[range-middle=true]:text-[#221F1C]',
        'data-[range-start=true]:bg-[#9B2531] data-[range-start=true]:text-white',
        'data-[range-end=true]:bg-[#9B2531] data-[range-end=true]:text-white',
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
