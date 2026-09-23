import { NextResponse } from "next/server";
import { requireAdministrator, staffApiError } from "../../staff-api";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const auth = await requireAdministrator();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await context.params;
    const result = await auth.service.update(auth.actorId, id, await request.json());
    return NextResponse.json(result);
  } catch (error) {
    return staffApiError(error);
  }
}
