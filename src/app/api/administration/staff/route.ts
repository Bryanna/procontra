import { NextResponse } from "next/server";
import { requireAdministrator, staffApiError } from "../staff-api";

export async function GET() {
  const auth = await requireAdministrator();
  if ("response" in auth) return auth.response;
  try {
    return NextResponse.json(await auth.service.list());
  } catch (error) {
    return staffApiError(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdministrator();
  if ("response" in auth) return auth.response;
  try {
    const input = await request.json();
    return NextResponse.json(await auth.service.create(auth.actorId, input), { status: 201 });
  } catch (error) {
    return staffApiError(error);
  }
}
