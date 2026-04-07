import { addMonths, addYears, addDays, addWeeks, isBefore, isAfter, parseISO, startOfDay } from 'date-fns';
import { RegularPayment } from '../types';

export interface GeneratedOccurrence {
  date: Date;
  installmentNumber: number;
}

export function generateOccurrences(payment: RegularPayment, windowStart: Date, windowEnd: Date): GeneratedOccurrence[] {
  const occurrences: GeneratedOccurrence[] = [];
  const startDate = startOfDay(parseISO(payment.startDate));
  const endDate = payment.endDate ? startOfDay(parseISO(payment.endDate)) : null;
  
  let current = startDate;
  
  if (payment.scheduleType === 'trial' && payment.trialEndDate) {
    // If it's a trial, the first actual payment is on the trial end date
    current = startOfDay(parseISO(payment.trialEndDate));
  }
  
  if (isAfter(current, windowEnd)) return occurrences;
  
  const limit = endDate && isBefore(endDate, windowEnd) ? endDate : windowEnd;
  
  let index = 0;
  
  if (payment.scheduleType === 'one-time') {
    if (!isBefore(current, windowStart) && !isAfter(current, windowEnd)) {
      occurrences.push({ date: current, installmentNumber: 1 });
    }
    return occurrences;
  }
  
  // Failsafe for infinite loops
  let iterations = 0;
  const maxIterations = 10000;
  
  while (!isAfter(current, limit) && iterations < maxIterations) {
    iterations++;
    
    if (!isBefore(current, windowStart)) {
      if (payment.kind === 'banking' && payment.totalInstallments && index >= payment.totalInstallments) {
        break;
      }
      occurrences.push({ date: current, installmentNumber: index + 1 });
    }
    
    index++;
    
    const scheduleToUse = payment.scheduleType === 'trial' ? (payment.postTrialScheduleType || 'monthly') : payment.scheduleType;
    
    if (scheduleToUse === 'monthly') {
      current = addMonths(payment.scheduleType === 'trial' && payment.trialEndDate ? startOfDay(parseISO(payment.trialEndDate)) : startDate, index);
    } else if (scheduleToUse === 'yearly') {
      current = addYears(payment.scheduleType === 'trial' && payment.trialEndDate ? startOfDay(parseISO(payment.trialEndDate)) : startDate, index);
    } else if (scheduleToUse === 'custom') {
      const count = payment.intervalCount || 1;
      const baseDate = payment.scheduleType === 'trial' && payment.trialEndDate ? startOfDay(parseISO(payment.trialEndDate)) : startDate;
      if (payment.intervalUnit === 'day') current = addDays(baseDate, index * count);
      else if (payment.intervalUnit === 'week') current = addWeeks(baseDate, index * count);
      else if (payment.intervalUnit === 'month') current = addMonths(baseDate, index * count);
      else if (payment.intervalUnit === 'year') current = addYears(baseDate, index * count);
      else break;
    } else {
      break;
    }
  }
  
  return occurrences;
}
