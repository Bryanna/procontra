export interface ModuleMetric {
  label: string;
  value: string;
  detail: string;
  tone: "emerald" | "amber" | "blue" | "rose";
}

export interface ModuleRow {
  primary: string;
  secondary: string;
  meta: string;
  status: string;
  tone: "emerald" | "amber" | "blue" | "rose" | "slate";
}

export interface ModuleConfig {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  secondaryAction: string;
  tableTitle: string;
  columns: [string, string, string, string];
  metrics: ModuleMetric[];
  rows: ModuleRow[];
  insightTitle: string;
  insights: string[];
}

export const moduleConfigs: ModuleConfig[] = [
  {
    slug: "pacientes",
    eyebrow: "GESTIÓN DE PACIENTES",
    title: "Pacientes",
    description: "Perfiles, consentimientos y tratamientos organizados por ciclo de continuidad.",
    action: "Registrar paciente",
    secondaryAction: "Importar pacientes",
    tableTitle: "Pacientes recientes",
    columns: ["Paciente", "Tratamiento", "Sucursal", "Estado"],
    metrics: [
      { label: "Pacientes activos", value: "248", detail: "+18 este mes", tone: "emerald" },
      { label: "Consentimiento vigente", value: "92%", detail: "228 autorizados", tone: "blue" },
      { label: "Reposición próxima", value: "31", detail: "Próximos 7 días", tone: "amber" },
      { label: "Seguimiento en riesgo", value: "12", detail: "Requieren acción", tone: "rose" },
    ],
    rows: [
      { primary: "María Rodríguez", secondary: "Losartán 50 mg", meta: "Esperanza 70", status: "Activo", tone: "emerald" },
      { primary: "José Martínez", secondary: "Metformina 850 mg", meta: "Esperanza 70", status: "Reposición próxima", tone: "amber" },
      { primary: "Ana Castillo", secondary: "Amlodipino 10 mg", meta: "Amina 01", status: "Sin respuesta", tone: "slate" },
      { primary: "Rafael Peña", secondary: "Insulina glargina", meta: "Jaibón 81", status: "Revisión", tone: "rose" },
    ],
    insightTitle: "Calidad del registro",
    insights: ["18 perfiles nuevos este mes", "7 teléfonos por validar", "4 consentimientos próximos a revisión"],
  },
  {
    slug: "documentos",
    eyebrow: "CAPTURA Y CONCILIACIÓN",
    title: "Documentos",
    description: "Facturas, autorizaciones y recetas con extracción, revisión y control de duplicados.",
    action: "Subir documento",
    secondaryAction: "Abrir excepciones",
    tableTitle: "Bandeja de procesamiento",
    columns: ["Documento", "Paciente", "Recibido", "Estado"],
    metrics: [
      { label: "Recibidos hoy", value: "26", detail: "14 conciliados", tone: "blue" },
      { label: "Procesados", value: "21", detail: "81% del total", tone: "emerald" },
      { label: "Revisión humana", value: "3", detail: "Datos incompletos", tone: "amber" },
      { label: "Duplicados evitados", value: "2", detail: "Sin segunda salida", tone: "rose" },
    ],
    rows: [
      { primary: "Factura F-008421", secondary: "María Rodríguez", meta: "Hace 8 min", status: "Conciliada", tone: "emerald" },
      { primary: "Autorización ARS-7712", secondary: "José Martínez", meta: "Hace 21 min", status: "Procesando", tone: "blue" },
      { primary: "Receta R-2026-188", secondary: "Ana Castillo", meta: "Hace 34 min", status: "Revisión", tone: "amber" },
      { primary: "Factura F-008419", secondary: "Rafael Peña", meta: "Hace 1 h", status: "Posible duplicado", tone: "rose" },
    ],
    insightTitle: "Control documental",
    insights: ["Hash aplicado a todas las cargas", "2 pares factura–autorización vinculados", "3 campos ilegibles pendientes"],
  },
  {
    slug: "dispensaciones",
    eyebrow: "SALIDAS CONTROLADAS",
    title: "Dispensaciones",
    description: "Registro único de medicamentos entregados, vinculado con documentos e inventario.",
    action: "Nueva dispensación",
    secondaryAction: "Registrar reverso",
    tableTitle: "Movimientos recientes",
    columns: ["Paciente", "Medicamento", "Referencia", "Estado"],
    metrics: [
      { label: "Dispensadas hoy", value: "34", detail: "RD$ 48,620", tone: "emerald" },
      { label: "Con autorización", value: "27", detail: "79% del total", tone: "blue" },
      { label: "Pendientes", value: "5", detail: "Revisión documental", tone: "amber" },
      { label: "Reversos", value: "1", detail: "Con auditoría", tone: "rose" },
    ],
    rows: [
      { primary: "María Rodríguez", secondary: "Losartán 50 mg · 1 caja", meta: "F-008421", status: "Publicada", tone: "emerald" },
      { primary: "José Martínez", secondary: "Metformina 850 mg · 2 cajas", meta: "F-008420", status: "Validada", tone: "blue" },
      { primary: "Ana Castillo", secondary: "Amlodipino 10 mg · 1 caja", meta: "R-2026-188", status: "Pendiente", tone: "amber" },
      { primary: "Rafael Peña", secondary: "Insulina glargina · 2 unidades", meta: "REV-0021", status: "Revertida", tone: "rose" },
    ],
    insightTitle: "Integridad de salidas",
    insights: ["100% con clave idempotente", "14 autorizaciones conciliadas", "1 reverso requiere cierre gerencial"],
  },
  {
    slug: "inventario",
    eyebrow: "EXISTENCIAS POR SUCURSAL",
    title: "Inventario",
    description: "Existencia, reservas, mínimos, lotes y disponibilidad real por medicamento.",
    action: "Actualizar inventario",
    secondaryAction: "Registrar transferencia",
    tableTitle: "Productos con riesgo",
    columns: ["Producto", "Disponible", "Sucursal", "Estado"],
    metrics: [
      { label: "Productos activos", value: "16,457", detail: "Catálogo maestro", tone: "blue" },
      { label: "Bajo mínimo", value: "8", detail: "3 críticos", tone: "amber" },
      { label: "Agotados", value: "3", detail: "Requieren compra", tone: "rose" },
      { label: "Reservado", value: "42", detail: "12 reservas", tone: "emerald" },
    ],
    rows: [
      { primary: "Losartán 50 mg", secondary: "6 unidades", meta: "Esperanza 70", status: "Bajo mínimo", tone: "amber" },
      { primary: "Metformina 850 mg", secondary: "9 unidades", meta: "Esperanza 70", status: "Bajo mínimo", tone: "amber" },
      { primary: "Amlodipino 10 mg", secondary: "3 unidades", meta: "Amina 01", status: "Crítico", tone: "rose" },
      { primary: "Insulina glargina", secondary: "18 unidades", meta: "Jaibón 81", status: "Disponible", tone: "emerald" },
    ],
    insightTitle: "Acciones sugeridas",
    insights: ["Transferir 8 unidades desde Maizal", "Reponer 3 productos agotados", "Revisar 4 lotes próximos a vencer"],
  },
  {
    slug: "continuidad",
    eyebrow: "SEGUIMIENTO TERAPÉUTICO",
    title: "Continuidad",
    description: "Ciclos de reposición, alertas y excepciones calculados con datos verificables.",
    action: "Programar alerta",
    secondaryAction: "Revisar excepciones",
    tableTitle: "Próximas reposiciones",
    columns: ["Paciente", "Tratamiento", "Fecha estimada", "Estado"],
    metrics: [
      { label: "Continuidad confirmada", value: "84%", detail: "+6.4% este mes", tone: "emerald" },
      { label: "Alertas programadas", value: "44", detail: "Próximos 7 días", tone: "blue" },
      { label: "Pendientes", value: "27", detail: "Sin respuesta", tone: "amber" },
      { label: "En riesgo", value: "12", detail: "Escalamiento", tone: "rose" },
    ],
    rows: [
      { primary: "María Rodríguez", secondary: "Losartán 50 mg", meta: "Hoy", status: "Stock confirmado", tone: "emerald" },
      { primary: "José Martínez", secondary: "Metformina 850 mg", meta: "Mañana", status: "Alerta lista", tone: "blue" },
      { primary: "Ana Castillo", secondary: "Amlodipino 10 mg", meta: "29 ago", status: "Sin respuesta", tone: "amber" },
      { primary: "Rafael Peña", secondary: "Insulina glargina", meta: "30 ago", status: "Revisión", tone: "rose" },
    ],
    insightTitle: "Semáforo operativo",
    insights: ["209 pacientes en verde", "27 pacientes en amarillo", "12 pacientes en rojo"],
  },
  {
    slug: "reservas",
    eyebrow: "DISPONIBILIDAD COMPROMETIDA",
    title: "Reservas",
    description: "Medicamentos apartados con vencimiento, retiro, entrega y liberación controlada.",
    action: "Crear reserva",
    secondaryAction: "Coordinar entrega",
    tableTitle: "Reservas activas",
    columns: ["Paciente", "Producto", "Vencimiento", "Estado"],
    metrics: [
      { label: "Reservas activas", value: "12", detail: "42 unidades", tone: "blue" },
      { label: "Listas para retiro", value: "9", detail: "75% del total", tone: "emerald" },
      { label: "Vencen hoy", value: "2", detail: "Contactar paciente", tone: "amber" },
      { label: "Entregas pendientes", value: "3", detail: "Ruta abierta", tone: "rose" },
    ],
    rows: [
      { primary: "María Rodríguez", secondary: "Losartán 50 mg · 1", meta: "Hoy, 5:00 p. m.", status: "Lista", tone: "emerald" },
      { primary: "José Martínez", secondary: "Metformina 850 mg · 2", meta: "Mañana", status: "Confirmada", tone: "blue" },
      { primary: "Ana Castillo", secondary: "Amlodipino 10 mg · 1", meta: "Hoy, 3:00 p. m.", status: "Por vencer", tone: "amber" },
      { primary: "Rafael Peña", secondary: "Insulina glargina · 2", meta: "Entrega 4:30 p. m.", status: "En ruta", tone: "rose" },
    ],
    insightTitle: "Eficiencia de reservas",
    insights: ["91% de recogida este mes", "2 reservas por vencer hoy", "3 entregas en coordinación"],
  },
  {
    slug: "mensajeria",
    eyebrow: "WHATSAPP Y ATENCIÓN",
    title: "Mensajería",
    description: "Recordatorios autorizados, respuestas, opt-out y transferencias a atención humana.",
    action: "Nueva conversación",
    secondaryAction: "Gestionar plantillas",
    tableTitle: "Conversaciones recientes",
    columns: ["Paciente", "Último mensaje", "Hora", "Estado"],
    metrics: [
      { label: "Mensajes enviados", value: "38", detail: "Hoy", tone: "blue" },
      { label: "Entregados", value: "36", detail: "94.7%", tone: "emerald" },
      { label: "Esperando respuesta", value: "11", detail: "Seguimiento", tone: "amber" },
      { label: "Atención humana", value: "4", detail: "Bandeja activa", tone: "rose" },
    ],
    rows: [
      { primary: "María Rodríguez", secondary: "Deseo reservar para retiro", meta: "10:42 a. m.", status: "Respondido", tone: "emerald" },
      { primary: "José Martínez", secondary: "Recordatorio de reposición", meta: "10:28 a. m.", status: "Entregado", tone: "blue" },
      { primary: "Ana Castillo", secondary: "¿Todavía tiene medicamento?", meta: "9:54 a. m.", status: "Sin respuesta", tone: "amber" },
      { primary: "Rafael Peña", secondary: "Necesita hablar con farmacia", meta: "9:31 a. m.", status: "Atención humana", tone: "rose" },
    ],
    insightTitle: "Canal de atención",
    insights: ["26 respuestas recibidas", "4 casos transferidos", "1 opt-out aplicado inmediatamente"],
  },
  {
    slug: "reportes",
    eyebrow: "INTELIGENCIA OPERATIVA",
    title: "Reportes",
    description: "Continuidad, consumo, inventario y valor económico con cifras conciliadas.",
    action: "Generar reporte",
    secondaryAction: "Exportar datos",
    tableTitle: "Reportes disponibles",
    columns: ["Reporte", "Periodo", "Actualizado", "Estado"],
    metrics: [
      { label: "Conversión a dispensación", value: "68%", detail: "+8% este mes", tone: "emerald" },
      { label: "Ingreso atribuible", value: "RD$ 186K", detail: "Últimos 30 días", tone: "blue" },
      { label: "Venta perdida", value: "RD$ 21K", detail: "Por falta de stock", tone: "rose" },
      { label: "Tiempo ahorrado", value: "32 h", detail: "Estimado mensual", tone: "amber" },
    ],
    rows: [
      { primary: "Continuidad mensual", secondary: "Agosto 2026", meta: "Hoy, 7:00 a. m.", status: "Listo", tone: "emerald" },
      { primary: "Riesgo de inventario", secondary: "Semana 35", meta: "Hoy, 6:30 a. m.", status: "Listo", tone: "emerald" },
      { primary: "Reservas y recogida", secondary: "Últimos 30 días", meta: "Ayer", status: "Listo", tone: "blue" },
      { primary: "Pronóstico por sucursal", secondary: "Septiembre 2026", meta: "Pendiente", status: "Calculando", tone: "amber" },
    ],
    insightTitle: "Lectura gerencial",
    insights: ["84% de continuidad confirmada", "68% de alertas terminan en dispensación", "RD$ 21K de oportunidad por stock"],
  },
  {
    slug: "administracion",
    eyebrow: "CONFIGURACIÓN Y SEGURIDAD",
    title: "Administración",
    description: "Usuarios, sucursales, roles, políticas, integraciones y auditoría de la plataforma.",
    action: "Invitar usuario",
    secondaryAction: "Ver auditoría",
    tableTitle: "Usuarios y accesos",
    columns: ["Usuario", "Rol", "Sucursal", "Estado"],
    metrics: [
      { label: "Usuarios activos", value: "14", detail: "4 sucursales", tone: "blue" },
      { label: "Roles configurados", value: "8", detail: "Permisos revisados", tone: "emerald" },
      { label: "Acciones auditadas", value: "1,284", detail: "Últimos 30 días", tone: "amber" },
      { label: "Alertas de seguridad", value: "0", detail: "Sin incidentes", tone: "emerald" },
    ],
    rows: [
      { primary: "Abel Medrano", secondary: "Administrador", meta: "Todas", status: "Activo", tone: "emerald" },
      { primary: "Laura Pérez", secondary: "Coordinación PROCONTRA", meta: "Esperanza 70", status: "Activo", tone: "emerald" },
      { primary: "Carlos Gómez", secondary: "Inventario", meta: "Esperanza 70", status: "Activo", tone: "blue" },
      { primary: "Marta Díaz", secondary: "Atención WhatsApp", meta: "Amina 01", status: "Invitación pendiente", tone: "amber" },
    ],
    insightTitle: "Controles activos",
    insights: ["RLS habilitada por sucursal", "Service role restringida al servidor", "Respaldos y auditoría pendientes de integración"],
  },
];

export function getModuleConfig(slug: string): ModuleConfig | null {
  return moduleConfigs.find((module) => module.slug === slug) ?? null;
}
