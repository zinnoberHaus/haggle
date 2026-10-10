import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Sign in · Haggle" };
export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <AuthForm mode="sign-in" next={next} />;
}
