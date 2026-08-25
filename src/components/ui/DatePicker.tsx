import React from 'react';
import {
  DatePicker as HeroUIDatePicker,
  Calendar as HeroUICalendar,
} from '@heroui/react';
import { parseDate, CalendarDate } from '@internationalized/date';
import { Calendar as CalendarIcon } from 'lucide-react';

export interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Selecciona una fecha',
  label,
  disabled = false,
  minDate,
  maxDate,
  className = '',
}) => {
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  let parsedValue: CalendarDate | null = null;
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    try {
      parsedValue = parseDate(value);
    } catch {
      parsedValue = null;
    }
  }

  let parsedMinValue: CalendarDate | undefined = undefined;
  if (minDate && /^\d{4}-\d{2}-\d{2}$/.test(minDate)) {
    try {
      parsedMinValue = parseDate(minDate);
    } catch {
      parsedMinValue = undefined;
    }
  }

  let parsedMaxValue: CalendarDate | undefined = undefined;
  if (maxDate && /^\d{4}-\d{2}-\d{2}$/.test(maxDate)) {
    try {
      parsedMaxValue = parseDate(maxDate);
    } catch {
      parsedMaxValue = undefined;
    }
  }

  const handleChange = (dateValue: unknown) => {
    if (!dateValue) {
      onChange('');
      return;
    }
    // dateValue can be CalendarDate or string
    onChange(String(dateValue));
  };

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
          {label}
        </label>
      )}

      <HeroUIDatePicker
        value={parsedValue}
        onChange={handleChange}
        minValue={parsedMinValue}
        maxValue={parsedMaxValue}
        isDisabled={disabled}
        className="w-full"
      >
        <HeroUIDatePicker.Trigger
          ref={triggerRef}
          className="w-full flex items-center justify-between px-3 py-2 bg-surface-secondary border border-border-default rounded-xl text-text-primary text-xs font-medium focus:outline-none focus:border-brand-primary transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2 truncate">
            <CalendarIcon size={14} className="text-text-tertiary shrink-0" />
            <span className={parsedValue ? 'text-text-primary font-mono' : 'text-text-tertiary'}>
              {parsedValue ? parsedValue.toString() : placeholder}
            </span>
          </div>
          <HeroUIDatePicker.TriggerIndicator className="text-text-tertiary" />
        </HeroUIDatePicker.Trigger>

        <HeroUIDatePicker.Popover
          triggerRef={triggerRef}
          placement="bottom start"
          offset={8}
          shouldFlip
          className="p-3 bg-surface border border-border-strong rounded-2xl shadow-2xl z-[9999] text-text-primary outline-none min-w-[280px] w-auto"
        >
          <HeroUICalendar className="w-full">
            <HeroUICalendar.Header className="flex items-center justify-between pb-2 mb-2 border-b border-border-subtle">
              <HeroUICalendar.NavButton slot="previous" className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer" />
              <HeroUICalendar.Heading className="text-xs font-bold text-text-primary" />
              <HeroUICalendar.NavButton slot="next" className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer" />
            </HeroUICalendar.Header>

            <HeroUICalendar.Grid className="w-full border-collapse">
              <HeroUICalendar.GridHeader>
                {(day) => (
                  <HeroUICalendar.HeaderCell className="text-[11px] font-bold text-text-tertiary pb-1 text-center w-8 h-8">
                    {day}
                  </HeroUICalendar.HeaderCell>
                )}
              </HeroUICalendar.GridHeader>
              <HeroUICalendar.GridBody>
                {(date) => (
                  <HeroUICalendar.Cell
                    date={date}
                    className="w-8 h-8 text-center text-xs text-text-primary font-medium rounded-lg hover:bg-surface-hover cursor-pointer data-[selected=true]:bg-brand-primary data-[selected=true]:text-white data-[disabled=true]:opacity-30 data-[disabled=true]:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {({ formattedDate }) => <span>{formattedDate}</span>}
                  </HeroUICalendar.Cell>
                )}
              </HeroUICalendar.GridBody>
            </HeroUICalendar.Grid>
          </HeroUICalendar>
        </HeroUIDatePicker.Popover>
      </HeroUIDatePicker>
    </div>
  );
};

