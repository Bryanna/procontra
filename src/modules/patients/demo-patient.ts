export interface PatientTreatment {
  name: string;
  presentation: string;
  directions: string;
  quantity: string;
  lastDispensed: string;
  coverageDays: number;
  estimatedEnd: string;
  alertDate: string;
  stockStatus: string;
  status: string;
}

export interface PatientDispensation {
  date: string;
  medicine: string;
  quantity: string;
  document: string;
  branch: string;
  status: string;
}

export interface PatientActivity {
  title: string;
  detail: string;
  time: string;
  tone: "emerald" | "blue" | "amber";
}

export interface Patient {
  id: string;
  name: string;
  initials: string;
  document: string;
  phone: string;
  branch: string;
  insurance: string;
  joinedAt: string;
  consent: string;
  continuityStatus: string;
  nextAction: string;
  nextActionDate: string;
  treatment: PatientTreatment;
  dispensations: PatientDispensation[];
  activity: PatientActivity[];
}

export const demoPatient: Patient = {
  id: "maria-rodriguez",
  name: "María Rodríguez",
  initials: "MR",
  document: "001-1234567-8",
  phone: "+1 (809) 555-0142",
  branch: "Esperanza 70",
  insurance: "ARS SENASA",
  joinedAt: "12 jun 2026",
  consent: "Consentimiento vigente",
  continuityStatus: "Continuidad al día",
  nextAction: "Alerta programada",
  nextActionDate: "27 ago · 9:00 a. m.",
  treatment: {
    name: "Losartán 50 mg",
    presentation: "Caja de 30 tabletas",
    directions: "1 tableta al día",
    quantity: "1 caja",
    lastDispensed: "2 ago 2026",
    coverageDays: 30,
    estimatedEnd: "31 ago 2026",
    alertDate: "27 ago 2026",
    stockStatus: "Stock confirmado · Esperanza 70",
    status: "Activo",
  },
  dispensations: [
    { date: "2 ago 2026", medicine: "Losartán 50 mg", quantity: "1 caja", document: "Factura F-008421", branch: "Esperanza 70", status: "Conciliada" },
    { date: "3 jul 2026", medicine: "Losartán 50 mg", quantity: "1 caja", document: "Factura F-007984", branch: "Esperanza 70", status: "Conciliada" },
    { date: "4 jun 2026", medicine: "Losartán 50 mg", quantity: "1 caja", document: "Factura F-007531", branch: "Esperanza 70", status: "Conciliada" },
  ],
  activity: [
    { title: "Recordatorio entregado por WhatsApp", detail: "Plantilla: reposición próxima", time: "Hoy · 10:42 a. m.", tone: "emerald" },
    { title: "Stock confirmado", detail: "12 unidades disponibles en Esperanza 70", time: "Hoy · 9:15 a. m.", tone: "blue" },
    { title: "Próxima alerta calculada", detail: "Cuatro días antes del agotamiento estimado", time: "2 ago · 11:08 a. m.", tone: "amber" },
  ],
};
