'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client/browser';
import type { Enums } from '../types/database';
import {
  checkInAtPartnerGym,
  getPartnerVisitAllowance,
  getPartnerVisitsForAttendanceDate,
  listActivePartnerGyms,
  listGymPartnerships,
  listIncomingPartnerVisits,
  listMemberPartnerVisits,
  listOutgoingPartnerVisits,
  requestGymPartnership,
  respondToPartnership,
  reversePartnerVisit,
  updatePartnershipStatus,
} from '../services/partnerships';
import { queryKeys } from './query-keys';

export function useGymPartnerships(
  client: TypedSupabaseClient,
  gymId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.gymPartnerships(gymId ?? ''),
    queryFn: () => {
      if (!gymId) return [];
      return listGymPartnerships(client, gymId);
    },
    enabled: Boolean(gymId),
  });
}

export function useActivePartnerGyms(
  client: TypedSupabaseClient,
  homeGymId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.activePartnerGyms(homeGymId ?? ''),
    queryFn: () => {
      if (!homeGymId) return [];
      return listActivePartnerGyms(client, homeGymId);
    },
    enabled: Boolean(homeGymId),
  });
}

export function usePartnerVisitAllowance(
  client: TypedSupabaseClient,
  memberUserId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.partnerAllowance(memberUserId ?? ''),
    queryFn: () => {
      if (!memberUserId) {
        return { monthly_limit: 3, visits_used: 0, visits_remaining: 3 };
      }
      return getPartnerVisitAllowance(client, memberUserId);
    },
    enabled: Boolean(memberUserId),
  });
}

export function useMemberPartnerVisits(
  client: TypedSupabaseClient,
  memberUserId: string | null | undefined,
  fromYmd?: string,
) {
  return useQuery({
    queryKey: queryKeys.memberPartnerVisits(memberUserId ?? '', fromYmd ?? ''),
    queryFn: () => {
      if (!memberUserId) return [];
      return listMemberPartnerVisits(client, memberUserId, { fromYmd, limit: 60 });
    },
    enabled: Boolean(memberUserId),
  });
}

export function useIncomingPartnerVisits(
  client: TypedSupabaseClient,
  gymId: string | null | undefined,
  fromYmd?: string,
) {
  return useQuery({
    queryKey: queryKeys.incomingPartnerVisits(gymId ?? '', fromYmd ?? ''),
    queryFn: () => {
      if (!gymId) return [];
      return listIncomingPartnerVisits(client, gymId, fromYmd);
    },
    enabled: Boolean(gymId),
  });
}

export function useOutgoingPartnerVisits(
  client: TypedSupabaseClient,
  gymId: string | null | undefined,
  fromYmd?: string,
) {
  return useQuery({
    queryKey: queryKeys.outgoingPartnerVisits(gymId ?? '', fromYmd ?? ''),
    queryFn: () => {
      if (!gymId) return [];
      return listOutgoingPartnerVisits(client, gymId, fromYmd);
    },
    enabled: Boolean(gymId),
  });
}

export function usePartnerVisitsForDate(
  client: TypedSupabaseClient,
  gymId: string | null | undefined,
  dateYmd: string,
) {
  return useQuery({
    queryKey: queryKeys.partnerVisitsForDate(gymId ?? '', dateYmd),
    queryFn: () => {
      if (!gymId) return [];
      return getPartnerVisitsForAttendanceDate(client, gymId, dateYmd);
    },
    enabled: Boolean(gymId && dateYmd),
  });
}

export function useRequestPartnership(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      requestingGymId: string;
      partnerGymCode: string;
      requestedBy: string;
      monthlyVisitLimit?: number;
    }) => requestGymPartnership(client, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.gymPartnerships(variables.requestingGymId),
      });
    },
  });
}

export function useRespondToPartnership(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      partnershipId: string;
      status: Extract<Enums<'gym_partnership_status'>, 'active' | 'rejected'>;
      approvedBy: string;
      gymId: string;
    }) =>
      respondToPartnership(client, {
        partnershipId: input.partnershipId,
        status: input.status,
        approvedBy: input.approvedBy,
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gymPartnerships(variables.gymId) });
      void queryClient.invalidateQueries({ queryKey: ['active-partner-gyms'] });
    },
  });
}

export function useUpdatePartnershipStatus(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      partnershipId: string;
      status: Extract<Enums<'gym_partnership_status'>, 'suspended' | 'ended' | 'active'>;
      gymId: string;
    }) =>
      updatePartnershipStatus(client, {
        partnershipId: input.partnershipId,
        status: input.status,
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gymPartnerships(variables.gymId) });
      void queryClient.invalidateQueries({ queryKey: ['active-partner-gyms'] });
    },
  });
}

export function usePartnerCheckIn(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      visitedGymId: string;
      checkInMethod?: Enums<'partner_check_in_method'>;
    }) => checkInAtPartnerGym(client, input.visitedGymId, input.checkInMethod ?? 'qr'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['partner-allowance'] });
      void queryClient.invalidateQueries({ queryKey: ['member-partner-visits'] });
      void queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      void queryClient.invalidateQueries({ queryKey: ['partner-visits-date'] });
    },
  });
}

export function useReversePartnerVisit(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { visitId: string; reason?: string }) =>
      reversePartnerVisit(client, input.visitId, input.reason ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['partner-allowance'] });
      void queryClient.invalidateQueries({ queryKey: ['incoming-partner-visits'] });
      void queryClient.invalidateQueries({ queryKey: ['outgoing-partner-visits'] });
      void queryClient.invalidateQueries({ queryKey: ['partner-visits-date'] });
      void queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    },
  });
}
