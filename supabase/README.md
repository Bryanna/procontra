# Supabase para PROCONTRA

## Seguridad

- La instancia local vive en `/opt/procontra-supabase`.
- API, PostgreSQL y pooler se vinculan únicamente a `127.0.0.1`.
- La aplicación pública usa `https://93.127.215.188` mediante Nginx.
- Next.js se vincula únicamente a `127.0.0.1:3001`; el puerto 3001 no se publica.
- `.env.local` nunca se agrega a Git y debe conservar permisos `600`.
- `SUPABASE_SERVICE_ROLE_KEY` se usa exclusivamente en servidor e importadores.
- No usar el prefijo `NEXT_PUBLIC_` para la clave `service_role`.
- No publicar Studio, PostgreSQL ni el gateway sin dominio, proxy, TLS y control de acceso.

## Convención multi-tenant obligatoria

- El esquema operativo es `api`; `public` no contiene tablas operativas.
- Todas las tablas usan el patrón `api.t_<nombre>`.
- Todos los campos usan el prefijo `f_`.
- Cada tabla, sin excepción, contiene `f_id`, `f_id_secuencia`, `f_uuid`,
  `f_email_principal`, `f_rnc_principal`, `f_idempresa`, `f_idsucursal` y `f_app`.
- El alcance tenant se identifica por `f_idempresa + f_idsucursal + f_app`.
- La empresa inicial es `4`, la aplicación inicial es `0` y las sucursales son:
  Esperanza 70=`1`, Amina 01=`2`, Jaibón 81=`3`, Maizal 48=`4`.
- Las consultas de Supabase JS deben usar `.schema("api")`; las llamadas REST deben
  enviar `Accept-Profile: api` o `Content-Profile: api` según corresponda.
- Las políticas RLS validan el tenant autenticado mediante `api.fn_tenant_autorizado`.
- Las migraciones `0004_tenant_api_convention.sql` y `0005_tenant_constraints.sql`
  preservan UUID, relaciones y datos existentes, aplican la convención completa,
  convierten las claves de negocio en claves únicas por tenant y bloquean relaciones
  cruzadas entre tenants, incluso cuando escribe `service_role`.

## Acceso inicial

El administrador técnico local se aprovisiona con:

```bash
python3 scripts/bootstrap_local_admin.py
```

Las credenciales de arranque se guardan en `/root/procontra-admin-credentials.txt` con modo `0600` y nunca se imprimen. La cuenta local usa un correo técnico; debe sustituirse por una cuenta institucional individual antes del piloto y rotar la contraseña.

Las cookies de sesión son `HttpOnly`, `Secure` y `SameSite=Lax`. Los eventos de ingreso y cierre quedan en `audit_events` sin guardar correo, contraseña ni contenido clínico.

## HTTPS por IP

- Certificado: Let's Encrypt para `93.127.215.188`, perfil `shortlived`.
- Vigencia: aproximadamente seis días.
- Timer: `procontra-certbot-renew.timer`, cada seis horas.
- Hook: valida y recarga Nginx después de una renovación efectiva.

Comprobar:

```bash
systemctl status procontra-certbot-renew.timer
/root/.local/bin/certbot certificates
curl -I https://93.127.215.188/ingresar
```

## Instancia local

```bash
cd /opt/procontra-supabase
sh run.sh status
sh run.sh start
sh run.sh stop
```

## Migraciones

Aplicar todas las migraciones versionadas en orden:

```bash
for migration in supabase/migrations/*.sql; do
  docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$migration"
done
```

Las migraciones deben ser idempotentes o registrarse antes de repetirlas en un entorno ya poblado.

## Importar catálogo

```bash
python3 scripts/import_catalog_to_supabase.py --env-file .env.local
```

El importador usa `upsert` por `products.code`, conserva ceros iniciales y no crea posiciones de inventario.

## Importar inventario operativo

Primero validar la plantilla sin escribir:

```bash
/root/.venvs/xlsx/bin/python scripts/import_inventory_to_supabase.py \
  ruta/inventario.xlsx --env-file .env.local --dry-run
```

Luego importar:

```bash
/root/.venvs/xlsx/bin/python scripts/import_inventory_to_supabase.py \
  ruta/inventario.xlsx --env-file .env.local
```

El `upsert` usa `product_id + branch_id + lot`. Productos o sucursales desconocidos, campos vacíos, negativos o posiciones duplicadas detienen la carga.

## Migrar a Supabase en línea

1. Crear el proyecto administrado y guardar sus valores solo en un `.env.local` seguro.
2. Aplicar `supabase/migrations/*.sql` en orden en la base remota.
3. Cambiar `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` por las del proyecto remoto.
4. Ejecutar `import_catalog_to_supabase.py`.
5. Ejecutar `import_inventory_to_supabase.py` únicamente con inventario operativo validado.
6. Comparar conteos, códigos únicos, sucursales, RLS y políticas antes de cambiar tráfico.
7. Mantener la instancia local sin escrituras durante la ventana final de migración o realizar una exportación PostgreSQL consistente.

No copiar claves en comandos compartidos, commits, capturas ni registros.
