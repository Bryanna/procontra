import { redirect } from "next/navigation";

import { AdministrationWorkspace } from "@/components/administration-workspace";
import { createStaffAdministrationServicePort } from "@/infrastructure/supabase/staff-administration-server";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { StaffAdministrationService } from "@/modules/administration/staff-administration-service";
import { getTenantScopeForUser } from "@/infrastructure/supabase/tenant-context-server";

export default async function AdministrationPage() {
  const session = await createSupabaseSessionClient();
  const { data } = await session.auth.getUser();
  if (!data.user) redirect("/ingresar");
  const tenant = await getTenantScopeForUser(data.user.id);
  const service = new StaffAdministrationService(createStaffAdministrationServicePort(tenant));
  return <AdministrationWorkspace currentUserId={data.user.id} initialData={await service.list()} />;
}
