\set ON_ERROR_STOP on
BEGIN;

DO $test$
DECLARE
  v_actor api.t_perfiles%ROWTYPE;
  v_branch api.t_sucursales%ROWTYPE;
  v_product api.t_productos%ROWTYPE;
  v_patient uuid;
  v_plan uuid;
  v_disp uuid;
  v_retry uuid;
  v_count bigint;
  v_stock numeric;
  v_rejected boolean := false;
BEGIN
  select * into strict v_actor from api.t_perfiles
  where f_activo and f_rol='administrator' order by f_id limit 1;
  select * into strict v_branch from api.t_sucursales
  where f_idempresa=v_actor.f_idempresa and f_app=v_actor.f_app and f_codigo='70' and f_activo limit 1;
  select * into strict v_product from api.t_productos
  where f_idempresa=v_actor.f_idempresa and f_app=v_actor.f_app and f_activo order by f_id limit 1;

  v_patient:=api.fn_crear_paciente(
    v_actor.f_uuid,'QA-COMPRA-FLUJO','Paciente Temporal Compra','+18090000002','ARS APS',
    v_branch.f_uuid,true,null,null,date '1980-01-01',true,'green','whatsapp',
    'qa-only-key-with-at-least-32-characters'
  );

  insert into api.t_posiciones_inventario(
    f_uuid_producto,f_uuid_sucursal,f_disponible,f_reservado,f_minimo_reorden,f_lote,
    f_fecha_vencimiento,f_costo,f_precio,f_actualizado_en,f_fuente,
    f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app
  ) values(
    v_product.f_uuid,v_branch.f_uuid,100,0,10,'QA-COMPRA-001',current_date+365,1,2,now(),'qa',
    v_actor.f_email_principal,v_actor.f_rnc_principal,v_actor.f_idempresa,v_branch.f_idsucursal,v_actor.f_app
  );

  v_plan:=api.fn_crear_plan_seguimiento(
    v_actor.f_idempresa,v_branch.f_idsucursal,v_actor.f_app,v_actor.f_email_principal,v_actor.f_rnc_principal,v_actor.f_uuid,
    v_patient,'aps',current_date-30,'QA producto dispensable','Dr. QA',null,'QA COMPRA RESPALDADA',
    'manual',3,1,current_date-30,current_date+1,current_date
  );

  select count(*) into v_count from api.fn_buscar_productos_dispensables(
    v_actor.f_idempresa,v_actor.f_app,v_plan,v_product.f_codigo,10
  ) where f_uuid=v_product.f_uuid and f_disponible=100;
  if v_count<>1 then raise exception 'Búsqueda no devolvió el producto con existencia'; end if;
  raise notice 'OK 1/8: producto dispensable localizado por plan y sucursal';

  begin
    perform api.fn_registrar_resultado_seguimiento(
      v_actor.f_idempresa,v_actor.f_app,v_plan,'compro','in_person','QA bypass',null,v_actor.f_uuid
    );
  exception when others then
    if sqlerrm not like '%Compra requiere dispensación%' then raise; end if;
    v_rejected:=true;
  end;
  if not v_rejected then raise exception 'El RPC antiguo permitió compra sin dispensación'; end if;
  raise notice 'OK 2/8: compra administrativa sin dispensación fue bloqueada';

  v_disp:=api.fn_registrar_compra_seguimiento(
    v_actor.f_idempresa,v_actor.f_app,v_plan,v_product.f_uuid,30,1,true,
    'qa-compra-plan-receta-1',1,'in_person','QA compra real',v_actor.f_uuid
  );

  if not exists(select 1 from api.t_dispensaciones where f_uuid=v_disp and f_uuid_plan_seguimiento=v_plan and f_numero_receta_plan=1 and f_estado='posted') then
    raise exception 'Dispensación publicada no vinculada al plan';
  end if;
  if not exists(select 1 from api.t_items_dispensacion where f_uuid_dispensacion=v_disp and f_uuid_producto=v_product.f_uuid and f_cantidad=30) then
    raise exception 'Ítem de dispensación ausente';
  end if;
  if not exists(select 1 from api.t_movimientos_inventario where f_uuid_dispensacion=v_disp and f_tipo_movimiento='dispensation' and f_cantidad=-30) then
    raise exception 'Movimiento de inventario ausente';
  end if;
  select f_disponible into v_stock from api.t_posiciones_inventario
  where f_uuid_producto=v_product.f_uuid and f_uuid_sucursal=v_branch.f_uuid and f_lote='QA-COMPRA-001';
  if v_stock<>70 then raise exception 'Inventario esperado 70, recibido %',v_stock; end if;
  raise notice 'OK 3/8: dispensación, ítem y movimiento redujeron stock de 100 a 70';

  if not exists(
    select 1 from api.t_ciclos_continuidad c join api.t_items_dispensacion i on i.f_uuid=c.f_uuid_item_dispensacion
    where i.f_uuid_dispensacion=v_disp and c.f_estado='active' and c.f_dias_cobertura=30
      and c.f_fecha_agotamiento=current_date+30 and c.f_fecha_alerta=current_date+23
  ) then raise exception 'Ciclo de continuidad calculado incorrectamente'; end if;
  if not exists(
    select 1 from api.t_alertas a join api.t_ciclos_continuidad c on c.f_uuid=a.f_uuid_ciclo
    join api.t_items_dispensacion i on i.f_uuid=c.f_uuid_item_dispensacion
    where i.f_uuid_dispensacion=v_disp and a.f_estado='scheduled'
  ) then raise exception 'Alerta de continuidad ausente'; end if;
  raise notice 'OK 4/8: ciclo de 30 días y alerta 7 días antes creados';

  if not exists(select 1 from api.t_contactos_seguimiento where f_uuid_plan=v_plan and f_resultado='compro') then
    raise exception 'Contacto de compra ausente';
  end if;
  if not exists(select 1 from api.t_planes_seguimiento where f_uuid=v_plan and f_numero_receta_actual=2 and f_estado='active' and f_ultimo_resultado='compro') then
    raise exception 'Plan no avanzó de receta 1 a 2';
  end if;
  raise notice 'OK 5/8: contacto registrado y plan avanzó una receta';

  v_retry:=api.fn_registrar_compra_seguimiento(
    v_actor.f_idempresa,v_actor.f_app,v_plan,v_product.f_uuid,30,1,true,
    'qa-compra-plan-receta-1',1,'in_person','QA reintento',v_actor.f_uuid
  );
  if v_retry<>v_disp then raise exception 'Reintento no devolvió la dispensación original'; end if;
  select f_disponible into v_stock from api.t_posiciones_inventario
  where f_uuid_producto=v_product.f_uuid and f_uuid_sucursal=v_branch.f_uuid and f_lote='QA-COMPRA-001';
  if v_stock<>70 then raise exception 'Reintento descontó inventario nuevamente'; end if;
  select count(*) into v_count from api.t_dispensaciones where f_uuid_plan_seguimiento=v_plan;
  if v_count<>1 then raise exception 'Reintento creó % dispensaciones',v_count; end if;
  raise notice 'OK 6/8: reintento idempotente no duplicó dispensación ni descuento';

  v_rejected:=false;
  begin
    perform api.fn_registrar_compra_seguimiento(
      v_actor.f_idempresa,v_actor.f_app,v_plan,v_product.f_uuid,31,1,true,
      'qa-compra-plan-receta-1',1,'in_person','QA clave reutilizada',v_actor.f_uuid
    );
  exception when others then
    if sqlerrm not like '%Conflicto de clave idempotente%' then raise; end if;
    v_rejected:=true;
  end;
  if not v_rejected then raise exception 'La clave idempotente aceptó una cantidad diferente'; end if;
  raise notice 'OK 7/8: reutilizar la clave con otra cantidad produjo conflicto';

  v_rejected:=false;
  begin
    perform api.fn_registrar_compra_seguimiento(
      v_actor.f_idempresa,v_actor.f_app,v_plan,v_product.f_uuid,30,1,true,
      'qa-compra-plan-stale',1,'in_person','QA estado obsoleto',v_actor.f_uuid
    );
  exception when others then
    if sqlerrm not like '%El plan cambió%' then raise; end if;
    v_rejected:=true;
  end;
  if not v_rejected then raise exception 'Se aceptó una receta esperada obsoleta'; end if;
  raise notice 'OK 8/8: control optimista bloqueó una confirmación obsoleta';
END
$test$;

ROLLBACK;
