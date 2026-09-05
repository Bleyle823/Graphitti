type SessionUser = {
  name?: string | null;
  email?: string | null;
};

export function isAnonymousUser(user?: SessionUser | null): boolean {
  if (!user) {
    return true;
  }
  return user.name === "Anonymous" || Boolean(user.email?.startsWith("temp-"));
}
