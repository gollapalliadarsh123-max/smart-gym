'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useGymPartnerships,
  useRequestPartnership,
  useRespondToPartnership,
  useUpdatePartnershipStatus,
  type Tables,
} from '@smart-gym/supabase';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { StatusBadge, statusToneFromLabel } from '@/components/layout/status-badge';

type Partnership = Tables<'gym_partnerships'>;

function partnerIdFor(row: Partnership, gymId: string) {
  return row.requesting_gym_id === gymId ? row.partner_gym_id : row.requesting_gym_id;
}

export function OwnerPartnershipsPanel() {
  const { client, gym, userId } = useOwnerContext();
  const gymId = gym?.id;
  const partnershipsQuery = useGymPartnerships(client, gymId);
  const requestMutation = useRequestPartnership(client);
  const respondMutation = useRespondToPartnership(client);
  const updateMutation = useUpdatePartnershipStatus(client);

  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const partnerGymIds = [
    ...new Set(
      (partnershipsQuery.data ?? [])
        .map((row) => (gymId ? partnerIdFor(row, gymId) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const gymNamesQuery = useQuery({
    queryKey: ['partner-gym-names', partnerGymIds.join(',')],
    queryFn: async () => {
      if (!partnerGymIds.length) return {} as Record<string, string>;
      const { data, error: qError } = await client
        .from('gyms')
        .select('id, name')
        .in('id', partnerGymIds);
      if (qError) throw new Error(qError.message);
      return Object.fromEntries((data ?? []).map((g) => [g.id, g.name]));
    },
    enabled: partnerGymIds.length > 0,
  });

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!gymId || !userId) return;
    setMessage(null);
    setError(null);
    try {
      await requestMutation.mutateAsync({
        requestingGymId: gymId,
        partnerGymCode: code,
        requestedBy: userId,
      });
      setCode('');
      setMessage('Partnership request sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send request.');
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Partner gyms"
        description="Link another gym by code so members can visit with a monthly partner allowance."
      >
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => void handleRequest(e)}
        >
          <Field className="flex-1">
            <FieldLabel htmlFor="partner-code">Partner gym code</FieldLabel>
            <Input
              id="partner-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. IRONGYM"
              autoComplete="off"
              className="uppercase"
            />
          </Field>
          <Button type="submit" disabled={requestMutation.isPending || !code.trim()}>
            {requestMutation.isPending ? 'Sending…' : 'Send request'}
          </Button>
        </form>
        {message ? (
          <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>
        ) : null}
        {error ? <FieldError className="mt-3">{error}</FieldError> : null}
      </SectionCard>

      <SectionCard
        title="Partnerships"
        description="Approve, suspend, or end partner links for this gym."
      >
        {(partnershipsQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No partnership requests yet.</p>
        ) : (
          <ul className="space-y-3">
            {(partnershipsQuery.data ?? []).map((row) => {
              const otherId = gymId ? partnerIdFor(row, gymId) : '';
              const otherName = gymNamesQuery.data?.[otherId] ?? `${otherId.slice(0, 8)}…`;
              const incoming = gymId ? row.partner_gym_id === gymId : false;
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{otherName}</p>
                    <p className="text-xs text-muted-foreground">
                      {incoming ? 'Incoming request' : 'Outgoing request'} · limit{' '}
                      {row.monthly_visit_limit}/month
                    </p>
                    <div className="mt-2">
                      <StatusBadge tone={statusToneFromLabel(row.status)}>{row.status}</StatusBadge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.status === 'pending' && incoming ? (
                      <>
                        <Button
                          size="sm"
                          disabled={respondMutation.isPending || !userId || !gymId}
                          onClick={() =>
                            void respondMutation.mutateAsync({
                              partnershipId: row.id,
                              status: 'active',
                              approvedBy: userId!,
                              gymId: gymId!,
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={respondMutation.isPending || !userId || !gymId}
                          onClick={() =>
                            void respondMutation.mutateAsync({
                              partnershipId: row.id,
                              status: 'rejected',
                              approvedBy: userId!,
                              gymId: gymId!,
                            })
                          }
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                    {row.status === 'active' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateMutation.isPending || !gymId}
                          onClick={() =>
                            void updateMutation.mutateAsync({
                              partnershipId: row.id,
                              status: 'suspended',
                              gymId: gymId!,
                            })
                          }
                        >
                          Suspend
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateMutation.isPending || !gymId}
                          onClick={() =>
                            void updateMutation.mutateAsync({
                              partnershipId: row.id,
                              status: 'ended',
                              gymId: gymId!,
                            })
                          }
                        >
                          End
                        </Button>
                      </>
                    ) : null}
                    {row.status === 'suspended' ? (
                      <>
                        <Button
                          size="sm"
                          disabled={updateMutation.isPending || !gymId}
                          onClick={() =>
                            void updateMutation.mutateAsync({
                              partnershipId: row.id,
                              status: 'active',
                              gymId: gymId!,
                            })
                          }
                        >
                          Reactivate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateMutation.isPending || !gymId}
                          onClick={() =>
                            void updateMutation.mutateAsync({
                              partnershipId: row.id,
                              status: 'ended',
                              gymId: gymId!,
                            })
                          }
                        >
                          End
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
