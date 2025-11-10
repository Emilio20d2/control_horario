export const getUniversalAdminCredentials = () => {
  const email = process.env.NEXT_PUBLIC_DEFAULT_ADMIN_EMAIL ?? 'admin@example.com';
  return {
    email,
    normalizedEmail: email.toLowerCase(),
    password: process.env.NEXT_PUBLIC_DEFAULT_ADMIN_PASSWORD ?? 'admin1234',
  };
};

export const getUniversalUserPassword = () =>
  process.env.NEXT_PUBLIC_DEFAULT_USER_PASSWORD ?? process.env.NEXT_PUBLIC_DEFAULT_ADMIN_PASSWORD ?? 'admin1234';
