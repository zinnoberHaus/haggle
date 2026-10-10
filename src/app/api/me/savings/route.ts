import { authorized, getSavings, json, unavailable } from "@/lib/user-data";
export async function GET(request: Request) {
  try {
    const access = await authorized(request);
    if (access.response) return access.response;
    return json(await getSavings(access.user.id));
  } catch (error) {
    return unavailable(error);
  }
}
