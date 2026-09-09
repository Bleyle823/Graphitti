type SessionUser = {
  name?: string | null;
  email?: string | null;
  isAnonymous?: boolean | null;
};

export function isAnonymousUser(user?: SessionUser | null): boolean {
  if (!user) {
    return true;
  }
  if (user.isAnonymous === false) {
    return false;
  }
  if (user.name && user.name !== "Anonymous" && !user.email?.startsWith("temp-")) {
    return false;
  }
  return user.name === "Anonymous" || Boolean(user.email?.startsWith("temp-"));
}

export async function isAnonymousUserId(userId: string): Promise<boolean> {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("@/lib/db");
  const { userWallets, users } = await import("@/lib/db/schema");

  const wallet = await db.query.userWallets.findFirst({
    where: eq(userWallets.userId, userId),
    columns: { id: true },
  });
  if (wallet) {
    return false;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { isAnonymous: true, name: true, email: true },
  });

  return isAnonymousUser(user ?? undefined);
}
