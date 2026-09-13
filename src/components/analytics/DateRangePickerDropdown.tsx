import React from 'react';
import { DateRangeSelector, DateRangeSelectorProps } from '../ui/DateRangeSelector';

export type DateRangePickerDropdownProps = DateRangeSelectorProps;

export const DateRangePickerDropdown: React.FC<DateRangeSelectorProps> = (props) => {
  return <DateRangeSelector {...props} />;
};

export default DateRangePickerDropdown;
