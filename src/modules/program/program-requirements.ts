export type CapabilityStatus = "pending" | "designed" | "implemented" | "blocked";
export type CapabilityKind = "ui" | "domain" | "data" | "integration" | "security";

export interface ProgramSection {
  id: string;
  title: string;
  objective: string;
}

export interface ProgramCapability {
  id: string;
  sectionId: string;
  title: string;
  acceptance: string;
  pdfSection: string;
  kind: CapabilityKind;
  status: CapabilityStatus;
  dependency?: string;
}

export const programSections: ProgramSection[] = [
  { id: "governance", title: "Gobernanza del programa", objective: "Definir alcance, responsables y reglas verificables del piloto." },
  { id: "patients", title: "Pacientes y consentimiento", objective: "Mantener perfiles mínimos, identidad, preferencias y autorizaciones." },
  { id: "continuity", title: "Continuidad de tratamiento", objective: "Anticipar reposiciones sin tomar decisiones clínicas automáticas." },
  { id: "documents", title: "Documentos y dispensaciones", objective: "Conciliar evidencia y registrar una sola salida por operación real." },
  { id: "inventory", title: "Inventario inteligente", objective: "Gestionar existencias reales, riesgos, rotación y traslados." },
  { id: "reservations", title: "Reservas y entregas", objective: "Apartar productos con confirmación humana, plazo y trazabilidad." },
  { id: "messaging", title: "Mensajería y atención", objective: "Atender por WhatsApp con consentimiento, clasificación y transferencia humana." },
  { id: "voice-surveys", title: "Voz, encuestas y educación", objective: "Procesar notas de voz y medir experiencia sin exceder el consentimiento." },
  { id: "operations", title: "Operación interna", objective: "Resolver consultas, asignar tareas y controlar pendientes." },
  { id: "reporting", title: "Reportes e indicadores", objective: "Entregar información priorizada para decisiones y medición del programa." },
  { id: "security", title: "Seguridad y límites clínicos", objective: "Proteger datos, limitar accesos y escalar riesgos clínicos." },
  { id: "integrations", title: "Canales e integraciones", objective: "Conectar servicios externos mediante adaptadores seguros y auditables." },
];

const capability = (
  id: string,
  sectionId: string,
  title: string,
  acceptance: string,
  pdfSection: string,
  kind: CapabilityKind,
  status: CapabilityStatus = "pending",
  dependency?: string,
): ProgramCapability => ({ id, sectionId, title, acceptance, pdfSection, kind, status, dependency });

export const programCapabilities: ProgramCapability[] = [
  capability("GOV-01", "governance", "Configurar sucursal piloto", "La operación identifica Esperanza 70 como piloto y permite expansión controlada.", "§8 Plan de implementación", "data"),
  capability("GOV-02", "governance", "Definir cohorte y duración", "Se registran 30–50 pacientes, terapias incluidas y periodo de 30 días.", "§8 Plan de implementación", "domain"),
  capability("GOV-03", "governance", "Asignar responsable y suplente", "Cada turno tiene responsable principal y respaldo identificados.", "§10 Requisitos operativos", "data"),
  capability("GOV-04", "governance", "Configurar horario y SLA humano", "El horario y tiempo máximo de respuesta son visibles y medibles.", "§10 Requisitos operativos", "domain"),
  capability("GOV-05", "governance", "Aprobar plantillas y reglas de escalamiento", "Toda plantilla y regla posee versión, aprobador y vigencia.", "§10 Requisitos operativos", "security"),
  capability("GOV-06", "governance", "Registrar capacitación del personal", "Solo personal capacitado puede incorporarse al piloto.", "§10 Requisitos operativos", "security"),

  capability("PAT-01", "patients", "Crear identificador interno único", "Cada paciente tiene un ID no clínico único y estable.", "§7 Seguridad y §10 Datos mínimos", "data", "designed"),
  capability("PAT-02", "patients", "Registrar perfil mínimo", "Nombre, teléfono, sucursal preferida y tratamiento quedan validados.", "§10 Datos mínimos", "ui", "designed"),
  capability("PAT-03", "patients", "Registrar consentimiento versionado", "Canal, finalidad, fecha, texto y actor quedan auditados.", "§2.1 y §7 Seguridad", "security", "designed"),
  capability("PAT-04", "patients", "Verificar identidad antes de revelar datos", "La atención exige una comprobación aprobada antes de mostrar datos sensibles.", "§7 Seguridad", "security"),
  capability("PAT-05", "patients", "Gestionar preferencia de sucursal", "El paciente puede elegir una de las cuatro sucursales.", "§2.2 Consulta y reserva", "ui", "designed"),
  capability("PAT-06", "patients", "Aplicar opt-out SALIR", "SALIR suspende recordatorios o promociones de inmediato y queda auditado.", "§2.4 y §7 Seguridad", "domain"),

  capability("CON-01", "continuity", "Registrar tratamiento y presentación", "Medicamento y presentación provienen de datos validados, no inferidos.", "§2.1 Continuidad", "data", "designed"),
  capability("CON-02", "continuity", "Calcular duración estimada", "La duración usa cantidad y pauta verificadas y detiene casos incompletos.", "§2.1 Continuidad", "domain", "designed"),
  capability("CON-03", "continuity", "Calcular agotamiento y alerta", "Cada fecha se traza a una dispensación y regla vigente.", "§2.1 Continuidad", "domain", "designed"),
  capability("CON-04", "continuity", "Confirmar disponibilidad antes del aviso", "Ningún mensaje promete producto sin stock reciente y confirmación.", "§1 Objetivos y §2.2", "domain", "designed"),
  capability("CON-05", "continuity", "Clasificar verde, amarillo y rojo", "Cada seguimiento tiene prioridad explicable y siguiente acción.", "§2.1 Continuidad", "domain", "designed"),
  capability("CON-06", "continuity", "Escalar preguntas clínicas", "Dosis, efectos, cambios y emergencias salen del flujo automático.", "§2.1 y §7 Seguridad", "security"),

  capability("DOC-01", "documents", "Clasificar factura, autorización y receta", "Cada archivo recibe tipo, hash, estado y propietario de revisión.", "§3 Servicios internos", "domain", "designed"),
  capability("DOC-02", "documents", "Extraer únicamente datos visibles", "Campos ilegibles quedan marcados y requieren revisión humana.", "§7 Seguridad", "domain", "designed"),
  capability("DOC-03", "documents", "Detectar documentos duplicados", "El mismo hash o referencia no crea una segunda operación.", "§4 Inteligencia de inventario", "domain", "designed"),
  capability("DOC-04", "documents", "Vincular factura y autorización", "Ambos documentos apuntan a una única dispensación.", "§3 y §4", "domain", "designed"),
  capability("DOC-05", "documents", "Publicar una sola salida de inventario", "Una dispensación publicada genera exactamente un movimiento.", "§4 Inteligencia de inventario", "domain", "designed"),
  capability("DOC-06", "documents", "Revertir sin edición silenciosa", "Correcciones publicadas generan reverso compensatorio y auditoría.", "§3 Trazabilidad", "security", "designed"),

  capability("INV-01", "inventory", "Registrar existencias por sucursal", "Cada posición tiene producto, sucursal, existencia y actualización.", "§4 Datos mínimos", "data", "designed"),
  capability("INV-02", "inventory", "Registrar mínimos, lotes y vencimientos", "Mínimo, lote y vencimiento son obligatorios o quedan incompletos.", "§4 Datos mínimos", "data", "designed"),
  capability("INV-03", "inventory", "Registrar costo y precio", "Costo y precio conservan moneda, vigencia y fuente.", "§4 Datos mínimos", "data"),
  capability("INV-04", "inventory", "Detectar agotados y baja existencia", "Se priorizan posiciones con disponible cero o bajo mínimo.", "§4 Análisis", "domain", "designed"),
  capability("INV-05", "inventory", "Detectar próximos vencimientos", "Se generan ventanas configurables de 30, 60 y 90 días.", "§4 Análisis", "domain", "designed"),
  capability("INV-06", "inventory", "Analizar baja rotación y alta demanda", "El análisis declara periodo, sucursal, producto y calidad de datos.", "§4 Análisis", "domain"),
  capability("INV-07", "inventory", "Estimar necesidades de reposición", "La sugerencia usa consumo observado y nunca ejecuta compra.", "§4 Análisis", "domain"),
  capability("INV-08", "inventory", "Sugerir traslados internos", "La propuesta compara disponible, mínimos, demanda y vencimientos.", "§4 Análisis", "domain", "designed"),
  capability("INV-09", "inventory", "Detectar diferencias y anomalías", "Duplicados, faltantes y conflictos se envían a revisión.", "§4 Análisis", "domain", "designed"),
  capability("INV-10", "inventory", "Medir cobertura PROCONTRA", "Se compara stock utilizable contra ciclos próximos por sucursal.", "§4 Análisis", "domain"),
  capability("INV-11", "inventory", "Exigir aprobación humana", "Compras, traslados, ajustes y sustituciones no se ejecutan automáticamente.", "§4 Principio de control", "security"),

  capability("RES-01", "reservations", "Consultar producto en cuatro sucursales", "La respuesta muestra disponible y fecha de actualización por sucursal.", "§2.2 Consulta y reserva", "ui", "designed"),
  capability("RES-02", "reservations", "Elegir sucursal de retiro", "La reserva conserva la elección explícita del paciente.", "§2.2 Consulta y reserva", "ui", "designed"),
  capability("RES-03", "reservations", "Solicitar reserva con confirmación humana", "La solicitud no compromete stock hasta la confirmación autorizada.", "§2.2 Consulta y reserva", "domain", "designed"),
  capability("RES-04", "reservations", "Asignar referencia y plazo", "Cada reserva tiene referencia única, cantidad, responsable y vencimiento.", "§2.2 Consulta y reserva", "domain", "designed"),
  capability("RES-05", "reservations", "Expirar y liberar stock", "Una reserva vencida libera unidades una sola vez y queda auditada.", "§2.2 Consulta y reserva", "domain"),
  capability("RES-06", "reservations", "Registrar retiro o entrega", "Retiro y entrega cierran la reserva y vinculan la dispensación.", "§5 Indicadores", "domain", "designed"),

  capability("MSG-01", "messaging", "Enviar recordatorio autorizado", "Solo pacientes consentidos y elegibles entran a la cola.", "§2.1 Continuidad", "integration", "designed", "WhatsApp Business"),
  capability("MSG-02", "messaging", "Confirmar suministro restante", "La respuesta registra suficiente, insuficiente o desconocido.", "§2.1 Continuidad", "domain", "designed"),
  capability("MSG-03", "messaging", "Registrar intención de reposición", "Reservar, entregar, ya compró, necesita ayuda o no responde quedan clasificados.", "§2.1 Continuidad", "domain", "designed"),
  capability("MSG-04", "messaging", "Atender consultas frecuentes", "Consultas administrativas usan respuestas aprobadas y trazables.", "§1 Objetivos", "ui", "designed"),
  capability("MSG-05", "messaging", "Transferir a atención humana", "El caso conserva contexto mínimo, prioridad, cola y responsable.", "§1 y §2.1", "domain", "designed"),
  capability("MSG-06", "messaging", "Registrar entrega y respuesta", "Proveedor, identificador, hora y estado se guardan sin duplicar envíos.", "§3 Funciones administrativas", "integration", "pending", "WhatsApp Business"),
  capability("MSG-07", "messaging", "Atender por llamada humana", "No respuesta y casos complejos generan tarea de llamada.", "§6 Canales", "domain"),

  capability("VS-01", "voice-surveys", "Transcribir nota de voz", "El audio privado produce texto, idioma, proveedor y confianza.", "§2.3 Notas de voz", "integration", "pending", "Proveedor de transcripción"),
  capability("VS-02", "voice-surveys", "Resumir solicitud de audio", "El empleado recibe intención, datos faltantes y urgencia sin diagnóstico.", "§2.3 Notas de voz", "domain"),
  capability("VS-03", "voice-surveys", "Responder por texto o audio", "La respuesta usa plantilla aprobada y registra el formato.", "§2.3 Notas de voz", "integration"),
  capability("VS-04", "voice-surveys", "Detectar necesidad humana inmediata", "Señales urgentes bloquean automatización y alertan al personal.", "§2.3 y §7", "security"),
  capability("VS-05", "voice-surveys", "Enviar encuesta breve", "La encuesta mide disponibilidad encontrada y atención recibida.", "§2.4 Encuestas", "ui", "designed"),
  capability("VS-06", "voice-surveys", "Enviar educación general consentida", "Solo contenido aprobado y no clínico se envía a consentidos.", "§2.4 Encuestas", "security"),

  capability("OPS-01", "operations", "Consultar disponibilidad internamente", "El empleado obtiene posiciones autorizadas por sucursal.", "§3 Servicios internos", "ui", "designed"),
  capability("OPS-02", "operations", "Consultar agotados por sucursal", "La respuesta prioriza faltantes y fecha de actualización.", "§3 Servicios internos", "ui", "designed"),
  capability("OPS-03", "operations", "Consultar seguimientos del día", "La lista se ordena por riesgo, fecha y SLA.", "§3 Servicios internos", "ui", "designed"),
  capability("OPS-04", "operations", "Preparar resumen gerencial", "El asistente separa hechos, recomendaciones y decisiones pendientes.", "§3 Servicios internos", "domain", "designed"),
  capability("OPS-05", "operations", "Asignar tareas al personal", "Cada tarea tiene responsable, plazo, estado, prioridad y fuente.", "§3 Funciones administrativas", "domain", "designed"),
  capability("OPS-06", "operations", "Controlar pendientes y resultados", "Contactos, respuestas, reservas y cierres quedan trazables.", "§3 Funciones administrativas", "ui", "designed"),

  capability("REP-01", "reporting", "Generar reporte diario", "Incluye continuidad, riesgos, inventario, reservas y decisiones.", "§5 Reportes", "domain", "designed"),
  capability("REP-02", "reporting", "Generar reportes semanales y mensuales", "Periodo, filtros y fuente quedan declarados.", "§3 Funciones administrativas", "domain", "designed"),
  capability("REP-03", "reporting", "Medir contacto, respuesta y continuidad", "Indicadores se segmentan por tratamiento, sucursal y periodo.", "§9 Indicadores", "domain", "designed"),
  capability("REP-04", "reporting", "Medir pacientes recuperados", "Cada recuperación conserva causa y acción realizada.", "§9 Indicadores", "domain"),
  capability("REP-05", "reporting", "Medir tiempo de respuesta y ahorro", "Se comparan líneas base y periodo observado.", "§9 Indicadores", "domain"),
  capability("REP-06", "reporting", "Medir reservas retiradas", "Se calcula cumplimiento sobre reservas confirmadas elegibles.", "§5 y §9", "domain", "designed"),
  capability("REP-07", "reporting", "Medir ventas perdidas y atribuibles", "Solo dispensaciones vinculadas cuentan como conversión o ingreso.", "§9 Indicadores", "domain", "designed"),
  capability("REP-08", "reporting", "Medir agotados, vencidos y satisfacción", "Cada métrica declara alcance y calidad de datos.", "§9 Indicadores", "domain", "designed"),

  capability("SEC-01", "security", "Aplicar roles por función y sucursal", "Empleado, encargado, farmacéutico y dirección reciben mínimo privilegio.", "§7 Seguridad", "security", "designed"),
  capability("SEC-02", "security", "Mantener auditoría funcional", "Accesos, cambios, mensajes y aprobaciones son inmutables.", "§3 y §7", "security", "designed"),
  capability("SEC-03", "security", "Separar datos sensibles", "Logs y vistas generales excluyen identificación y contenido clínico.", "§3 y §7", "security"),
  capability("SEC-04", "security", "Prohibir diagnóstico y cambios automáticos", "El sistema no diagnostica, cambia dosis, sustituye ni suspende.", "§7 Límites clínicos", "security"),
  capability("SEC-05", "security", "Gestionar posibles emergencias", "Se recomienda atención de emergencia y se alerta al personal.", "§7 Emergencias", "security"),
  capability("SEC-06", "security", "Evitar datos sensibles en grupos", "Los canales generales nunca reciben datos clínicos identificables.", "§7 Seguridad", "security"),
  capability("SEC-07", "security", "Usar almacenamiento privado", "Documentos requieren autorización y URL temporal.", "§7 Seguridad", "security", "pending", "Supabase Storage"),

  capability("INT-01", "integrations", "Integrar WhatsApp de pacientes", "El adaptador usa idempotencia, recibos y plantillas aprobadas.", "§6 Canales", "integration", "blocked", "Credenciales WhatsApp Business"),
  capability("INT-02", "integrations", "Integrar canal privado del Dr. Jiménez", "Solo alertas ejecutivas mínimas se envían con recibo.", "§5 y §6", "integration", "blocked", "Canal y credenciales"),
  capability("INT-03", "integrations", "Integrar correo de reportes", "PDF/Excel se envían a destinatarios autorizados y se auditan.", "§5 y §6", "integration", "blocked", "SMTP o Google Workspace"),
  capability("INT-04", "integrations", "Integrar base PostgreSQL y autenticación", "Esquema, restricciones, RLS y sesiones protegen escrituras críticas.", "§6 Panel y §7 Seguridad", "integration", "pending", "Proyecto Supabase"),
  capability("INT-05", "integrations", "Integrar sistema de inventario disponible", "La sincronización conserva fuente, fecha y conciliación.", "§8 Fase 3", "integration", "blocked", "API o exportación del sistema"),
];

export function getCapabilitiesBySection(sectionId: string) {
  return programCapabilities.filter((item) => item.sectionId === sectionId);
}
