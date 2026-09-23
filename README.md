# PROCONTRA Platform

Plataforma de continuidad de tratamiento para Farmacia La Línea SRL.

## Estado actual

Esta primera entrega contiene:

- Dashboard operativo responsive.
- Navegación principal y menú móvil.
- Módulos de pacientes, documentos, dispensaciones, inventario, continuidad, reservas, mensajería, reportes y administración.
- Vistas operativas con datos de demostración.
- Arquitectura preparada para integrar Supabase en la siguiente etapa.
- Pruebas unitarias con Vitest y Testing Library.

Los datos visibles son demostrativos y no corresponden a pacientes reales.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000` o el puerto indicado por Next.js.

## Verificación

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Estructura principal

```text
src/
├── app/                       # Rutas y layouts de Next.js
├── components/                # AppShell y vistas compartidas
├── modules/platform/          # Configuración tipada de módulos
└── test/                      # Configuración de pruebas
```

## Próxima etapa

1. Configurar Supabase local, prueba y producción.
2. Añadir migraciones para usuarios, roles y sucursales.
3. Implementar Supabase Auth y políticas RLS.
4. Sustituir los datos demostrativos por consultas server-only.
5. Incorporar auditoría y almacenamiento privado de documentos.
