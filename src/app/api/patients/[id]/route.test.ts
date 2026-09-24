import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/app/api/patients/[id]/route.ts"), "utf8");

describe("patient detail API", () => {
  it("returns decrypted identifiers only after patient write authorization", () => {
    expect(source).toContain("export async function GET");
    expect(source).toContain("requirePatientWrite");
    expect(source).toContain('rpc("fn_consultar_identificadores_paciente"');
    expect(source).toContain("p_actor_uuid: auth.actorId");
    expect(source).toContain("p_paciente_uuid: id");
    expect(source).toContain("p_clave_datos: dataKey");
  });
});
