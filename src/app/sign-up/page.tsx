import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Join Haggle" };
export default async function SignUp({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <AuthForm mode="sign-up" next={next} />;
}
