'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client/browser';
import {
  listPayments,
  recordPayment,
  type PaymentListFilters,
  type RecordPaymentInput,
} from '../services/payments';
import { queryKeys } from './query-keys';

export function usePayments(
  client: TypedSupabaseClient,
  filters: PaymentListFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.payments(filters as Record<string, unknown>),
    queryFn: () => listPayments(client, filters),
    enabled,
  });
}

export function useMemberPayments(
  client: TypedSupabaseClient,
  userId: string | null | undefined,
  filters: Omit<PaymentListFilters, 'userId'> = {},
) {
  return useQuery({
    queryKey: queryKeys.payments({ ...filters, userId: userId ?? '' }),
    queryFn: () => {
      if (!userId) return [];
      return listPayments(client, { ...filters, userId, limit: filters.limit ?? 100 });
    },
    enabled: Boolean(userId),
  });
}

export function useRecordPayment(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordPaymentInput) => recordPayment(client, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
      void queryClient.invalidateQueries({ queryKey: ['gym-members', variables.gymId] });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.activeMembership(variables.userId),
      });
    },
  });
}
