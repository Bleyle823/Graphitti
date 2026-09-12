"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { refetchSidebar } from "@/lib/refetch-sidebar";

type UserInvitation = {
  id: string;
  email: string;
  role?: string | null;
  organizationId: string;
  organizationName?: string | null;
  organization?: { name?: string | null };
};

function start(task: Promise<unknown>): void {
  task.catch(() => {
    /* errors toasted in handler */
  });
}

export function AccountInvitations(): React.ReactElement {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!session?.user) {
      setInvitations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await authClient.organization.listUserInvitations();
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to load invitations");
      }
      const rows = (result.data ?? []) as UserInvitation[];
      setInvitations(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error(error);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (sessionPending) {
      return;
    }
    start(load());
  }, [load, sessionPending]);

  async function acceptInvitation(invitationId: string): Promise<void> {
    setActingId(invitationId);
    try {
      const result = await authClient.organization.acceptInvitation({
        invitationId,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Could not accept");
      }
      const orgId =
        result.data?.member?.organizationId ??
        result.data?.invitation?.organizationId;
      if (orgId) {
        await authClient.organization.setActive({ organizationId: orgId });
      }
      refetchSidebar();
      toast.success("Invitation accepted");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not accept invitation"
      );
    } finally {
      setActingId(null);
    }
  }

  async function rejectInvitation(invitationId: string): Promise<void> {
    setActingId(invitationId);
    try {
      const result = await authClient.organization.rejectInvitation({
        invitationId,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Could not reject");
      }
      toast.success("Invitation declined");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not decline invitation"
      );
    } finally {
      setActingId(null);
    }
  }

  if (sessionPending || loading) {
    return <Spinner />;
  }

  if (invitations.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No pending invitations for your account.
      </p>
    );
  }

  return (
    <div className="space-y-2" data-testid="account-invitations">
      {invitations.map((invitation) => {
        const orgName =
          invitation.organizationName ??
          invitation.organization?.name ??
          "Organization";
        return (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
            key={invitation.id}
          >
            <div>
              <div className="font-medium">{orgName}</div>
              <div className="text-muted-foreground text-xs">
                Role: {invitation.role ?? "member"}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={actingId === invitation.id}
                onClick={() => start(acceptInvitation(invitation.id))}
                size="sm"
              >
                Accept
              </Button>
              <Button
                disabled={actingId === invitation.id}
                onClick={() => start(rejectInvitation(invitation.id))}
                size="sm"
                variant="outline"
              >
                Decline
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
