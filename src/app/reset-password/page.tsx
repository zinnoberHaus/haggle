import { AuthForm } from "@/components/auth-form";
export const metadata = {
  title: "Reset your password · Haggle",
  robots: { index: false, follow: false },
};
export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return <AuthForm mode="reset-password" token={token} initialError={error} />;
}
