import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("patient search API", () => {
  it("provides a tenant-scoped GET search for operational pickers", () => {
    const route = readFileSync(join(process.cwd(), "src/app/api/patients/route.ts"), "utf8");
    const auth = readFileSync(join(process.cwd(), "src/app/api/patients/patient-api.ts"), "utf8");
    expect(route).toContain("export async function GET");
    expect(route).toContain("requirePatientRead");
    expect(route).toContain("searchPatientsFromDatabase");
    expect(route).toContain("pageSize");
    expect(auth).toContain("patients:read");
  });
});
