export type PatientMessageIntent =
  | "reserve"
  | "delivery"
  | "already_purchased"
  | "still_has_supply"
  | "needs_help"
  | "opt_out"
  | "clinical_handoff"
  | "emergency_handoff"
  | "unknown";

function normalize(message: string) {
  return message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function classifyPatientMessage(message: string): PatientMessageIntent {
  const text = normalize(message);
  if (/dificultad para respirar|no puedo respirar|perdida de conocimiento|dolor intenso/.test(text)) return "emergency_handoff";
  if (/cambiar.*dosis|cambio.*dosis|efecto adverso|reaccion|suspender|sustituir/.test(text)) return "clinical_handoff";
  if (/^salir$|no quiero.*mensaje|cancelar mensajes/.test(text)) return "opt_out";
  if (/reserv/.test(text)) return "reserve";
  if (/entrega|domicilio/.test(text)) return "delivery";
  if (/ya.*compre|lo compre/.test(text)) return "already_purchased";
  if (/todavia.*tengo|tengo medicamento|suficiente/.test(text)) return "still_has_supply";
  if (/ayuda|hablar.*farmacia|persona/.test(text)) return "needs_help";
  return "unknown";
}
