"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

type InvitePreview = {
  email: string;
  role: string;
  status: string;
  organizationName: string;
  expired: boolean;
};

export default function AcceptInvitationPage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <PageShell description="Loading your invitation." title="Invitation">
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
  const invitationId = useSearchParams().get("invitationId");
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!invitationId) {
      return;
    }
    let active = true;
    fetch(`/api/org/invitations/${encodeURIComponent(invitationId)}`)
      .then(async (response) => {
        const payload = (await response.json()) as InvitePreview & {
          error?: string;
        };
        if (!active) {
          return;
        }
        if (response.ok) {
          setInvite(payload);
        } else {
          setLoadError(payload.error ?? "This invitation link is not valid");
        }
      })
      .catch(() => {
        if (active) {
          setLoadError("Could not load this invitation");
        }
      });
    return () => {
      active = false;
    };
  }, [invitationId]);

  const sessionUser = session?.user;
  const sessionEmail = sessionUser?.email?.toLowerCase() ?? null;
  const isAnonymous = Boolean(sessionUser?.isAnonymous);
  const invitedEmail = invite?.email.toLowerCase() ?? null;
  const emailMatches = Boolean(
    invitedEmail && sessionEmail && !isAnonymous && sessionEmail === invitedEmail
  );
  const joinable = invite?.status === "pending" && !invite.expired;

  const accept = useCallback(async (): Promise<void> => {
    if (!invitationId) {
      return;
    }
    setJoining(true);
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
      router.replace("/");
      router.refresh();
    } catch (error) {
      setJoining(false);
      toast.error(
        error instanceof Error ? error.message : "Could not accept invitation"
      );
    }
  }, [invitationId, router]);

  useEffect(() => {
    if (emailMatches && joinable && !joining) {
      accept().catch(() => {
        /* surfaced as a toast */
      });
    }
  }, [accept, emailMatches, joinable, joining]);

  if (!invitationId) {
    return (
      <PageShell description="This invitation link is invalid." title="Invitation">
        <Button onClick={() => router.push("/settings")} variant="outline">
          Go to settings
        </Button>
      </PageShell>
    );
  }

  if (loadError) {
    return (
      <PageShell description={loadError} title="Invitation">
        <Button onClick={() => router.push("/")} variant="outline">
          Go to Graphitti
        </Button>
      </PageShell>
    );
  }

  if (!invite || sessionPending) {
    return (
      <PageShell description="Loading your invitation." title="Invitation">
        <Spinner />
      </PageShell>
    );
  }

  if (invite.status !== "pending") {
    return (
      <PageShell
        description={
          invite.status === "accepted"
            ? "This invitation was already accepted. Sign in to continue."
            : `This invitation is ${invite.status}. Ask an admin to send a new one.`
        }
        title={invite.organizationName}
      >
        <Button onClick={() => router.push("/")} variant="outline">
          Go to Graphitti
        </Button>
      </PageShell>
    );
  }

  if (invite.expired) {
    return (
      <PageShell
        description="This invitation expired. Ask an admin to send a new one."
        title={invite.organizationName}
      >
        <Button onClick={() => router.push("/")} variant="outline">
          Go to Graphitti
        </Button>
      </PageShell>
    );
  }

  if (emailMatches) {
    return (
      <PageShell
        description={`Joining ${invite.organizationName}...`}
        title="Accept invitation"
      >
        <Spinner />
      </PageShell>
    );
  }

  if (sessionUser && !isAnonymous) {
    return (
      <PageShell
        description={`You are signed in as ${sessionUser.email}, but this invitation is for ${invite.email}.`}
        title={`Join ${invite.organizationName}`}
      >
        <Button
          onClick={() => {
            authClient
              .signOut()
              .then(() => router.refresh())
              .catch(() => toast.error("Could not sign out"));
          }}
          variant="outline"
        >
          Sign out and switch account
        </Button>
      </PageShell>
    );
  }

  return (
    <PageShell
      description={`You were invited as ${invite.role}. Continue with ${invite.email} to join.`}
      title={`Join ${invite.organizationName}`}
    >
      <InvitationAuthForm invitedEmail={invite.email} />
    </PageShell>
  );
}

/**
 * The invitation email is the identity Better Auth checks on accept, so this
 * page always authenticates by email even when the rest of the app signs in
 * with a wallet. An existing anonymous (wallet) session is linked to the new
 * account by the anonymous plugin, so nothing is lost.
 */
function InvitationAuthForm({
  invitedEmail,
}: {
  invitedEmail: string;
}): React.ReactElement {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result =
        mode === "signup"
          ? await authClient.signUp.email({
              email: invitedEmail,
              password,
              name: name.trim() || invitedEmail,
            })
          : await authClient.signIn.email({ email: invitedEmail, password });
      if (result.error) {
        throw new Error(result.error.message ?? "Authentication failed");
      }
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Authentication failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="w-full max-w-sm space-y-4"
      onSubmit={(event) => {
        handleSubmit(event).catch(() => {
          /* surfaced inline */
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="invite-email">Email</Label>
        <Input disabled id="invite-email" readOnly value={invitedEmail} />
      </div>
      {mode === "signup" ? (
        <div className="space-y-2">
          <Label htmlFor="invite-name">Name</Label>
          <Input
            autoComplete="name"
            id="invite-name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            value={name}
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="invite-password">Password</Label>
        <Input
          autoComplete={
            mode === "signup" ? "new-password" : "current-password"
          }
          id="invite-password"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          required
          type="password"
          value={password}
        />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button className="w-full" disabled={submitting} type="submit">
        {submitting
          ? "Continuing..."
          : mode === "signup"
            ? "Create account and join"
            : "Sign in and join"}
      </Button>
      <Button
        className="w-full"
        onClick={() => {
          setMode(mode === "signup" ? "signin" : "signup");
          setError(null);
        }}
        type="button"
        variant="ghost"
      >
        {mode === "signup"
          ? "I already have an account"
          : "Create a new account instead"}
      </Button>
    </form>
  );
}
