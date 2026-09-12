"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { authClient } from "@/lib/auth-client";

export default function AcceptInvitationPage(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("invitationId");
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [accepting, setAccepting] = useState(false);

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
        description="Sign in with the email address that received the invitation, then accept."
        title="Accept invitation"
      >
        <div className="flex flex-col gap-3">
          <ConnectWalletButton />
          <Button asChild variant="outline">
            <Link href="/settings">Account settings</Link>
          </Button>
        </div>
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
