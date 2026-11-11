export const ADMIN_EMAIL = 'samanthachow0930@gmail.com';
export const STARTER_CREDITS = 10;

export function isAdminUser(profile, session) {
  const email = session?.user?.email?.toLowerCase();
  return Boolean(profile?.is_admin) || email === ADMIN_EMAIL;
}
