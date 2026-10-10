import { sql } from "@/lib/db";
import {
  authorized,
  getPreferences,
  json,
  preferencesSchema,
  readJson,
  unavailable,
} from "@/lib/user-data";

export async function GET(request: Request) {
  try {
    const access = await authorized(request);
    if (access.response) return access.response;
    return json({
      user: {
        id: access.user.id,
        name: access.user.name,
        email: access.user.email,
        emailVerified: access.user.emailVerified,
      },
      preferences: await getPreferences(access.user.id),
    });
  } catch (error) {
    return unavailable(error);
  }
}
export async function PATCH(request: Request) {
  try {
    const access = await authorized(request, true);
    if (access.response) return access.response;
    const parsed = preferencesSchema.safeParse(
      await readJson(request).catch(() => null),
    );
    if (!parsed.success)
      return json({ error: "Choose valid notification preferences." }, 400);
    await sql`INSERT INTO profiles (user_id, email_alerts, weekly_digest)
      VALUES (${access.user.id}, ${parsed.data.emailAlerts}, ${parsed.data.weeklyDigest})
      ON CONFLICT (user_id) DO UPDATE SET email_alerts = EXCLUDED.email_alerts,
        weekly_digest = EXCLUDED.weekly_digest, updated_at = now()`;
    return json({ preferences: parsed.data });
  } catch (error) {
    return unavailable(error);
  }
}
