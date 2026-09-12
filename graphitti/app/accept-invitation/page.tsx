"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AuthDialog } from "@/components/auth/dialog";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export default function AcceptInvitationPage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <PageShell description="Loading your session." title="Accept invitation">
          <Spinner />
        </PageShell>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}

function AcceptInvitationContent(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("invitationId");
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [accepting, setAccepting] = useState(false);
  const [authOpen, setAuthOpen] = useState(true);

  const callbackURL = useMemo(() => {
    if (!invitationId) {
      return "/accept-invitation";
    }
    return `/accept-invitation?invitationId=${encodeURIComponent(invitationId)}`;
  }, [invitationId]);

  const accept = useCallback(async (): Promise<void> => {
    if (!invitationId) {
      toast.error("Missing invitation link");
      return;
    }
    setAccepting(true);
    try {
      const result = await authClient.organization.acceptInvitation({
        invitationId,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Could not accept invitation");
      }
      const orgId =
        result.data?.member?.organizationId ??
        result.data?.invitation?.organizationId;
      if (orgId) {
        await authClient.organization.setActive({ organizationId: orgId });
      }
      toast.success("You joined the organization");
      router.replace("/treasury");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not accept invitation"
      );
    } finally {
      setAccepting(false);
    }
  }, [invitationId, router]);

  useEffect(() => {
    if (sessionPending || !invitationId) {
      return;
    }
    if (!session?.user) {
      return;
    }
    if (session.user.isAnonymous) {
      return;
    }
    accept().catch(() => {
      /* toast in accept */
    });
  }, [accept, invitationId, session?.user, sessionPending]);

  if (!invitationId) {
    return (
      <PageShell
        description="This invitation link is invalid."
        title="Invitation"
      >
        <Button onClick={() => router.push("/settings")} variant="outline">
          Go to settings
        </Button>
      </PageShell>
    );
  }

  if (sessionPending) {
    return (
      <PageShell description="Loading your session." title="Invitation">
        <Spinner />
      </PageShell>
    );
  }

  if (!session?.user || session.user.isAnonymous) {
    return (
      <PageShell
        description="Sign in or create an account with the same email that received the invitation."
        title="Accept invitation"
      >
        <AuthDialog
          callbackURL={callbackURL}
          onOpenChange={setAuthOpen}
          open={authOpen}
        >
          <Button className="w-full max-w-sm" type="button">
            Sign in to accept
          </Button>
        </AuthDialog>
      </PageShell>
    );
  }

  return (
    <PageShell
      description="Join your team on Graphitti."
      title="Accept invitation"
    >
      <Button disabled={accepting} onClick={() => accept()}>
        {accepting ? "Accepting..." : "Accept invitation"}
      </Button>
    </PageShell>
  );
}
