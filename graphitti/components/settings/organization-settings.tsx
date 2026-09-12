"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { refetchSidebar } from "@/lib/refetch-sidebar";

type MemberRow = {
  id: string;
  userId?: string;
  role: string;
  user?: {
    email?: string | null;
    name?: string | null;
  };
  email?: string | null;
};

type InvitationRow = {
  id: string;
  email: string;
  role?: string | null;
  status?: string | null;
};

function start(task: Promise<unknown>): void {
  task.catch(() => {
    /* errors are toasted by the async handler */
  });
}

async function fetchOrgDirectory(organizationId: string): Promise<{
  members: MemberRow[];
  invitations: InvitationRow[];
}> {
  const listed = await authClient.organization.listMembers({
    query: { organizationId },
  });
  if (listed.error) {
    throw new Error(listed.error.message ?? "Failed to list members");
  }
  const rows = (listed.data?.members ?? listed.data ?? []) as MemberRow[];
  const members = Array.isArray(rows) ? rows : [];

  const invited = await authClient.organization.listInvitations({
    query: { organizationId },
  });
  if (invited.error) {
    return { members, invitations: [] };
  }
  const inviteRows = (invited.data ?? []) as InvitationRow[];
  return {
    members,
    invitations: Array.isArray(inviteRows) ? inviteRows : [],
  };
}

function canManageMembers(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

function inviteLink(invitationId: string): string {
  return `${window.location.origin}/accept-invitation?invitationId=${encodeURIComponent(invitationId)}`;
}

function copyInviteLink(invitationId: string): void {
  const link = inviteLink(invitationId);
  navigator.clipboard
    .writeText(link)
    .then(() => toast.success("Invite link copied"))
    .catch(() => toast.error(`Copy failed. Link: ${link}`));
}

function memberLabel(member: MemberRow): string {
  return (
    member.user?.name ||
    member.user?.email ||
    member.email ||
    member.userId ||
    member.id
  );
}

function MemberCard({
  member,
  canManage,
  onRoleChange,
  onRemove,
}: {
  member: MemberRow;
  canManage: boolean;
  onRoleChange: (memberId: string, role: string) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
      <div>
        <div>{memberLabel(member)}</div>
        <div className="text-muted-foreground text-xs">{member.role}</div>
      </div>
      {canManage && member.role !== "owner" ? (
        <div className="flex items-center gap-2">
          <Select
            onValueChange={(value) => start(onRoleChange(member.id, value))}
            value={member.role}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">admin</SelectItem>
              <SelectItem value="member">member</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => start(onRemove(member.id))}
            size="sm"
            variant="ghost"
          >
            Remove
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function InviteForm({
  inviteEmail,
  inviteRole,
  inviting,
  onEmailChange,
  onRoleChange,
  onSubmit,
}: {
  inviteEmail: string;
  inviteRole: string;
  inviting: boolean;
  onEmailChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onSubmit: () => Promise<void>;
}): React.ReactElement {
  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm">Invite member</h3>
      <Input
        data-testid="org-invite-email"
        onChange={(event) => onEmailChange(event.target.value)}
        placeholder="teammate@company.com"
        type="email"
        value={inviteEmail}
      />
      <Select onValueChange={onRoleChange} value={inviteRole}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="member">member</SelectItem>
          <SelectItem value="admin">admin</SelectItem>
        </SelectContent>
      </Select>
      <Button
        data-testid="org-invite-submit"
        disabled={inviting}
        onClick={() => start(onSubmit())}
      >
        {inviting ? "Inviting..." : "Send invite"}
      </Button>
    </div>
  );
}

function ActiveOrgPanel({
  loadingMembers,
  members,
  invitations,
  canManage,
  inviteEmail,
  inviteRole,
  inviting,
  onRoleChange,
  onRemove,
  onEmailChange,
  onInviteRoleChange,
  onInvite,
  onCancelInvitation,
}: {
  loadingMembers: boolean;
  members: MemberRow[];
  invitations: InvitationRow[];
  canManage: boolean;
  inviteEmail: string;
  inviteRole: string;
  inviting: boolean;
  onRoleChange: (memberId: string, role: string) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
  onEmailChange: (value: string) => void;
  onInviteRoleChange: (value: string) => void;
  onInvite: () => Promise<void>;
  onCancelInvitation: (invitationId: string) => Promise<void>;
}): React.ReactElement {
  if (loadingMembers) {
    return <Spinner />;
  }

  return (
    <>
      <div className="space-y-2" data-testid="org-members">
        <h3 className="font-medium text-sm">Members</h3>
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm">No members yet</p>
        ) : (
          members.map((member) => (
            <MemberCard
              canManage={canManage}
              key={member.id}
              member={member}
              onRemove={onRemove}
              onRoleChange={onRoleChange}
            />
          ))
        )}
      </div>

      {canManage ? (
        <InviteForm
          inviteEmail={inviteEmail}
          inviteRole={inviteRole}
          inviting={inviting}
          onEmailChange={onEmailChange}
          onRoleChange={onInviteRoleChange}
          onSubmit={onInvite}
        />
      ) : null}

      {invitations.length > 0 ? (
        <div className="space-y-2">
          <h3 className="font-medium text-sm">Pending invitations</h3>
          <p className="text-muted-foreground text-xs">
            Copy the link if email does not arrive. Resend&apos;s
            onboarding@resend.dev address can only deliver to the Resend
            account owner until you verify a domain. Teammates must open the
            link and continue with the invited email.
          </p>
          {invitations.map((invitation) => (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
              key={invitation.id}
            >
              <span>
                {invitation.email} · {invitation.role ?? "member"} ·{" "}
                {invitation.status ?? "pending"}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => copyInviteLink(invitation.id)}
                  size="sm"
                  variant="outline"
                >
                  Copy link
                </Button>
                {canManage ? (
                  <Button
                    onClick={() => start(onCancelInvitation(invitation.id))}
                    size="sm"
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

export function OrganizationSettings(): React.ReactElement {
  const { data: activeOrganization, isPending: activePending } =
    authClient.useActiveOrganization();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  const activeOrgId = activeOrganization?.id ?? null;

  const loadMembers = useCallback(async () => {
    if (!activeOrgId) {
      setMembers([]);
      setInvitations([]);
      return;
    }
    setLoadingMembers(true);
    try {
      const directory = await fetchOrgDirectory(activeOrgId);
      setMembers(directory.members);
      setInvitations(directory.invitations);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load members"
      );
    } finally {
      setLoadingMembers(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    start(loadMembers());
  }, [loadMembers]);

  async function handleInvite(): Promise<void> {
    if (!(activeOrgId && inviteEmail.trim())) {
      return;
    }
    setInviting(true);
    const email = inviteEmail.trim();
    try {
      const response = await fetch("/api/org/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role: inviteRole,
          organizationId: activeOrgId,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        invitationId?: string;
        acceptUrl?: string;
        email?: {
          sent: boolean;
          reason?: string;
          detail?: string;
        };
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to invite member");
      }
      setInviteEmail("");
      if (payload.acceptUrl) {
        await navigator.clipboard.writeText(payload.acceptUrl).catch(() => {
          /* toast still explains how to copy from the list */
        });
      } else if (payload.invitationId) {
        copyInviteLink(payload.invitationId);
      }
      if (payload.email?.sent) {
        toast.success(`Invitation emailed to ${email}. Link also copied.`);
      } else if (payload.email?.reason === "recipient_not_allowed") {
        toast.warning(
          `Invite created for ${email}. Resend can only email the account owner until you verify a sending domain. Link copied — send it to your teammate.`
        );
      } else if (payload.email?.reason === "not_configured") {
        toast.warning(
          `Invite created for ${email}. Email is not configured. Link copied.`
        );
      } else {
        toast.warning(
          `Invite created for ${email}. Email did not send${payload.email?.detail ? `: ${payload.email.detail}` : ""}. Link copied.`
        );
      }
      await loadMembers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to invite member"
      );
    } finally {
      setInviting(false);
    }
  }

  async function handleCancelInvitation(invitationId: string): Promise<void> {
    if (!activeOrgId) {
      return;
    }
    const result = await authClient.organization.cancelInvitation({
      invitationId,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Failed to cancel invitation");
      return;
    }
    toast.success("Invitation canceled");
    await loadMembers();
  }

  async function handleLeaveOrganization(): Promise<void> {
    if (!activeOrgId) {
      return;
    }
    if (selfMember?.role === "owner") {
      toast.error(
        "Organization owners cannot leave yet. Transfer ownership or delete the org from Treasury."
      );
      return;
    }
    const response = await fetch("/api/org/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: activeOrgId }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      toast.error(payload.error ?? "Failed to leave organization");
      return;
    }
    refetchSidebar();
    toast.success("You left the organization");
    await loadMembers();
  }

  async function handleRemove(memberId: string): Promise<void> {
    if (!activeOrgId) {
      return;
    }
    const result = await authClient.organization.removeMember({
      memberIdOrEmail: memberId,
      organizationId: activeOrgId,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Failed to remove member");
      return;
    }
    toast.success("Member removed");
    await loadMembers();
  }

  async function handleRoleChange(
    memberId: string,
    role: string
  ): Promise<void> {
    if (!activeOrgId) {
      return;
    }
    const result = await authClient.organization.updateMemberRole({
      memberId,
      role,
      organizationId: activeOrgId,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Failed to update role");
      return;
    }
    toast.success("Role updated");
    await loadMembers();
  }

  const session = authClient.useSession();
  const selfMember = members.find(
    (member) =>
      member.userId === session.data?.user.id ||
      member.user?.email === session.data?.user.email
  );
  const canManage = canManageMembers(selfMember?.role);

  if (activePending) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="org-settings">
      {activeOrgId ? (
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>
          <TabsContent className="space-y-4 pt-4" value="general">
            <p className="text-muted-foreground text-sm">
              Active org:{" "}
              <span className="text-foreground">
                {activeOrganization?.name}
              </span>
              . Use the header switcher to change organizations.
            </p>
            {selfMember?.role !== "owner" ? (
              <Button
                onClick={() => start(handleLeaveOrganization())}
                variant="outline"
              >
                Leave organization
              </Button>
            ) : (
              <p className="text-muted-foreground text-xs">
                Owners manage membership from the Users tab. To remove the org,
                use Treasury.
              </p>
            )}
          </TabsContent>
          <TabsContent className="space-y-4 pt-4" value="users">
            <ActiveOrgPanel
              canManage={canManage}
              invitations={invitations}
              inviteEmail={inviteEmail}
              inviteRole={inviteRole}
              inviting={inviting}
              loadingMembers={loadingMembers}
              members={members}
              onCancelInvitation={handleCancelInvitation}
              onEmailChange={setInviteEmail}
              onInvite={handleInvite}
              onInviteRoleChange={setInviteRole}
              onRemove={handleRemove}
              onRoleChange={handleRoleChange}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-muted-foreground text-sm">
          Switch to an organization in the header, or create one from{" "}
          <a className="text-primary underline" href="/treasury">
            Treasury
          </a>
          .
        </p>
      )}
    </div>
  );
}
