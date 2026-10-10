import { auth, rejectCrossOrigin } from "@/lib/auth";

const handlers = auth.handler();
export const GET = handlers.GET;
type Context = { params: Promise<{ path: string[] }> };
const mutation =
  (method: "POST" | "PUT" | "DELETE" | "PATCH") =>
  async (request: Request, context: Context) => {
    const forbidden = rejectCrossOrigin(request);
    if (forbidden) return forbidden;
    return handlers[method](request, context);
  };
export const POST = mutation("POST");
export const PUT = mutation("PUT");
export const DELETE = mutation("DELETE");
export const PATCH = mutation("PATCH");
