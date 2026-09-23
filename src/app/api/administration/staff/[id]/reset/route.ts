import { NextResponse } from "next/server";
import { requireAdministrator, staffApiError } from "../../../staff-api";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  const auth = await requireAdministrator();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await context.params;
    return NextResponse.json(await auth.service.resetAccess(auth.actorId, id));
  } catch (error) {
    return staffApiError(error);
  }
}
