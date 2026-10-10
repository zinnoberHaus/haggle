import { redirect } from "next/navigation";
import { AccountPanel } from "@/components/account-panel";
import { getCurrentUser, isOperator } from "@/lib/auth";
import { getPreferences } from "@/lib/user-data";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your account · Haggle",
  robots: { index: false, follow: false },
};
export default async function Account() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/account");
  const preferences = await getPreferences(user.id);
  return (
    <AccountPanel
      user={{
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
      }}
      operator={isOperator(user.id)}
      initialPreferences={{
        emailAlerts: Boolean(preferences.emailAlerts),
        weeklyDigest: Boolean(preferences.weeklyDigest),
      }}
    />
  );
}
