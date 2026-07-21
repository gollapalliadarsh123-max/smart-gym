import { getMonthStartYmd, normalizeGymCode } from '@smart-gym/shared';
import type { TypedSupabaseClient } from '../client/browser';
import type {
  Enums,
  PartnerCheckInResult,
  PartnerVisitAllowance,
  Tables,
  TablesUpdate,
} from '../types/database';
import { assertData } from '../lib/errors';
import { getGymByCode, getGymById } from './gyms';

export type GymPartnership = Tables<'gym_partnerships'>;
export type PartnerGymVisit = Tables<'partner_gym_visits'>;

function otherGymId(row: GymPartnership, gymId: string): string {
  return row.requesting_gym_id === gymId ? row.partner_gym_id : row.requesting_gym_id;
}

export async function listGymPartnerships(
  client: TypedSupabaseClient,
  gymId: string,
): Promise<GymPartnership[]> {
  const { data, error } = await client
    .from('gym_partnerships')
    .select('*')
    .or(`requesting_gym_id.eq.${gymId},partner_gym_id.eq.${gymId}`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listActivePartnerGyms(
  client: TypedSupabaseClient,
  homeGymId: string,
): Promise<Array<{ partnership: GymPartnership; gym: Tables<'gyms'> }>> {
  const partnerships = (await listGymPartnerships(client, homeGymId)).filter(
    (row) => row.status === 'active',
  );

  const results: Array<{ partnership: GymPartnership; gym: Tables<'gyms'> }> = [];
  for (const partnership of partnerships) {
    const partnerId = otherGymId(partnership, homeGymId);
    const gym = await getGymById(client, partnerId);
    if (gym) results.push({ partnership, gym });
  }
  return results;
}

export async function requestGymPartnership(
  client: TypedSupabaseClient,
  input: {
    requestingGymId: string;
    partnerGymCode: string;
    requestedBy: string;
    monthlyVisitLimit?: number;
  },
): Promise<GymPartnership> {
  const partnerGym = await getGymByCode(client, normalizeGymCode(input.partnerGymCode));
  if (!partnerGym) {
    throw new Error('No gym found for that code.');
  }
  if (partnerGym.id === input.requestingGymId) {
    throw new Error('A gym cannot partner with itself.');
  }

  const { data, error } = await client
    .from('gym_partnerships')
    .insert({
      requesting_gym_id: input.requestingGymId,
      partner_gym_id: partnerGym.id,
      requested_by: input.requestedBy,
      monthly_visit_limit: input.monthlyVisitLimit ?? 3,
      status: 'pending',
    })
    .select('*')
    .single();

  return assertData(data, error, 'Failed to send partnership request');
}

export async function respondToPartnership(
  client: TypedSupabaseClient,
  input: {
    partnershipId: string;
    status: Extract<Enums<'gym_partnership_status'>, 'active' | 'rejected'>;
    approvedBy: string;
  },
): Promise<GymPartnership> {
  const patch =
    input.status === 'active'
      ? {
          status: input.status,
          approved_by: input.approvedBy,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      : {
          status: input.status,
          approved_by: input.approvedBy,
          updated_at: new Date().toISOString(),
        };

  const { data, error } = await client
    .from('gym_partnerships')
    .update(patch)
    .eq('id', input.partnershipId)
    .select('*')
    .single();

  return assertData(data, error, 'Failed to update partnership');
}

export async function updatePartnershipStatus(
  client: TypedSupabaseClient,
  input: {
    partnershipId: string;
    status: Extract<Enums<'gym_partnership_status'>, 'suspended' | 'ended' | 'active'>;
  },
): Promise<GymPartnership> {
  const patch: TablesUpdate<'gym_partnerships'> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.status === 'ended') {
    patch.ended_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from('gym_partnerships')
    .update(patch)
    .eq('id', input.partnershipId)
    .select('*')
    .single();

  return assertData(data, error, 'Failed to update partnership');
}

export async function checkInAtPartnerGym(
  client: TypedSupabaseClient,
  visitedGymId: string,
  checkInMethod: Enums<'partner_check_in_method'> = 'qr',
): Promise<PartnerCheckInResult> {
  const { data, error } = await client.rpc('check_in_at_partner_gym', {
    p_visited_gym_id: visitedGymId,
    p_check_in_method: checkInMethod,
  });

  if (error) throw new Error(error.message);
  return data as PartnerCheckInResult;
}

export async function reversePartnerVisit(
  client: TypedSupabaseClient,
  visitId: string,
  reason = '',
): Promise<{ success: boolean; message: string; visit_id?: string; status?: string }> {
  const { data, error } = await client.rpc('reverse_partner_visit', {
    p_visit_id: visitId,
    p_reason: reason,
  });

  if (error) throw new Error(error.message);
  return data as { success: boolean; message: string; visit_id?: string; status?: string };
}

export async function getPartnerVisitAllowance(
  client: TypedSupabaseClient,
  memberUserId?: string,
): Promise<PartnerVisitAllowance> {
  const { data, error } = await client.rpc('get_partner_visit_allowance', {
    p_member_user_id: memberUserId,
  });

  if (error) throw new Error(error.message);
  const row = data as PartnerVisitAllowance;
  return {
    monthly_limit: Number(row?.monthly_limit ?? 3),
    visits_used: Number(row?.visits_used ?? 0),
    visits_remaining: Number(row?.visits_remaining ?? 3),
  };
}

export async function listMemberPartnerVisits(
  client: TypedSupabaseClient,
  memberUserId: string,
  options?: { fromYmd?: string; limit?: number },
): Promise<PartnerGymVisit[]> {
  let query = client
    .from('partner_gym_visits')
    .select('*')
    .eq('member_user_id', memberUserId)
    .order('checked_in_at', { ascending: false });

  if (options?.fromYmd) query = query.gte('visit_date', options.fromYmd);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listIncomingPartnerVisits(
  client: TypedSupabaseClient,
  visitedGymId: string,
  fromYmd?: string,
): Promise<PartnerGymVisit[]> {
  let query = client
    .from('partner_gym_visits')
    .select('*')
    .eq('visited_gym_id', visitedGymId)
    .order('checked_in_at', { ascending: false });

  if (fromYmd) query = query.gte('visit_date', fromYmd);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listOutgoingPartnerVisits(
  client: TypedSupabaseClient,
  homeGymId: string,
  fromYmd?: string,
): Promise<PartnerGymVisit[]> {
  let query = client
    .from('partner_gym_visits')
    .select('*')
    .eq('home_gym_id', homeGymId)
    .order('checked_in_at', { ascending: false });

  if (fromYmd) query = query.gte('visit_date', fromYmd);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPartnerVisitsForAttendanceDate(
  client: TypedSupabaseClient,
  visitedGymId: string,
  dateYmd: string,
): Promise<PartnerGymVisit[]> {
  const { data, error } = await client
    .from('partner_gym_visits')
    .select('*')
    .eq('visited_gym_id', visitedGymId)
    .eq('visit_date', dateYmd);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export function monthStartForPartnerReport(): string {
  return getMonthStartYmd(new Date());
}

export { otherGymId };
