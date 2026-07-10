'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getLeagueSeasonId } from '@smart-gym/shared';
import type { TypedSupabaseClient } from '../client/browser';
import { getLeagueSeasonForUser, listLeagueLeaderboard } from '../services/league';
import {
  friendIdsFromRows,
  listChatMessages,
  listFriendRequests,
  listFriendships,
  markMessagesRead,
  respondToFriendRequest,
  sendChatMessage,
  sendFriendRequestByEmail,
} from '../services/social';
import { broadcastNotification, listGymNotifications } from '../services/notifications';
import { queryKeys } from './query-keys';

export function useLeagueSeason(
  client: TypedSupabaseClient,
  userId: string | null | undefined,
  seasonId: string = getLeagueSeasonId(),
) {
  return useQuery({
    queryKey: queryKeys.leagueSeason(userId ?? '', seasonId),
    queryFn: () => {
      if (!userId) return null;
      return getLeagueSeasonForUser(client, userId, seasonId);
    },
    enabled: Boolean(userId),
  });
}

export function useLeagueLeaderboard(
  client: TypedSupabaseClient,
  seasonId: string = getLeagueSeasonId(),
  limit = 50,
) {
  return useQuery({
    queryKey: queryKeys.leagueLeaderboard(seasonId),
    queryFn: () => listLeagueLeaderboard(client, seasonId, limit),
  });
}

export function useFriendRequests(client: TypedSupabaseClient, userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.friendRequests(userId ?? ''),
    queryFn: () => {
      if (!userId) return [];
      return listFriendRequests(client, userId);
    },
    enabled: Boolean(userId),
  });
}

export function useFriendships(client: TypedSupabaseClient, userId: string | null | undefined) {
  return useQuery({
    queryKey: ['friendships', userId ?? ''] as const,
    queryFn: async () => {
      if (!userId) return { rows: [], friendIds: [] as string[] };
      const rows = await listFriendships(client, userId);
      return { rows, friendIds: friendIdsFromRows(rows, userId) };
    },
    enabled: Boolean(userId),
  });
}

export function useSendFriendRequest(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { fromUserId: string; email: string }) =>
      sendFriendRequestByEmail(client, input.fromUserId, input.email),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.friendRequests(variables.fromUserId),
      });
    },
  });
}

export function useRespondToFriendRequest(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      requestId: string;
      status: 'accepted' | 'rejected';
      userId: string;
    }) => respondToFriendRequest(client, input.requestId, input.status),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.friendRequests(variables.userId),
      });
      void queryClient.invalidateQueries({ queryKey: ['friendships', variables.userId] });
    },
  });
}

export function useChatMessages(
  client: TypedSupabaseClient,
  userId: string | null | undefined,
  otherUserId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.chat(userId ?? '', otherUserId ?? ''),
    queryFn: () => {
      if (!userId || !otherUserId) return [];
      return listChatMessages(client, userId, otherUserId);
    },
    enabled: Boolean(userId && otherUserId),
    refetchInterval: 8_000,
  });
}

export function useSendChatMessage(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { senderId: string; recipientId: string; body: string }) =>
      sendChatMessage(client, {
        sender_id: input.senderId,
        recipient_id: input.recipientId,
        body: input.body,
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat(variables.senderId, variables.recipientId),
      });
    },
  });
}

export function useMarkMessagesRead(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { recipientId: string; senderId: string }) =>
      markMessagesRead(client, input.recipientId, input.senderId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat(variables.recipientId, variables.senderId),
      });
    },
  });
}

export function useGymNotifications(
  client: TypedSupabaseClient,
  gymId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.notifications(gymId ?? ''),
    queryFn: () => {
      if (!gymId) return [];
      return listGymNotifications(client, gymId);
    },
    enabled: Boolean(gymId),
  });
}

export function useBroadcastNotification(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      gymId: string;
      title: string;
      body: string;
      createdBy: string;
    }) =>
      broadcastNotification(client, {
        gym_id: input.gymId,
        title: input.title,
        body: input.body,
        created_by: input.createdBy,
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(variables.gymId),
      });
    },
  });
}
