\set ON_ERROR_STOP on

-- Prueba transaccional de /programa contra la base desplegada.
-- Crea paciente, tres planes y contactos; ROLLBACK elimina todos los datos QA.
BEGIN;

DO $test$
DECLARE
  v_actor api.t_perfiles%ROWTYPE;
  v_branch api.t_sucursales%ROWTYPE;
  v_patient uuid;
  v_auto uuid;
  v_manual uuid;
  v_case uuid;
  v_row record;
  v_count bigint;
  v_rejected boolean := false;
  v_first date := current_date - 60;
  v_manual_last date := current_date - 20;
  v_manual_next date := current_date + 10;
  v_manual_contact date := current_date + 3;
BEGIN
  SELECT * INTO STRICT v_actor
  FROM api.t_perfiles
  WHERE f_activo AND f_rol = 'administrator'
  ORDER BY f_id
  LIMIT 1;

  SELECT * INTO STRICT v_branch
  FROM api.t_sucursales
  WHERE f_idempresa = v_actor.f_idempresa
    AND f_app = v_actor.f_app
    AND f_codigo = '70'
    AND f_activo
  LIMIT 1;

  IF EXISTS (SELECT 1 FROM api.t_pacientes WHERE f_codigo_interno = 'QA-PROGRAMA-FLUJO') THEN
    RAISE EXCEPTION 'Residuo QA previo: QA-PROGRAMA-FLUJO';
  END IF;

  v_patient := api.fn_crear_paciente(
    v_actor.f_uuid,
    'QA-PROGRAMA-FLUJO',
    'Paciente Temporal Programa',
    '+18090000001',
    'MAPFRE Salud ARS',
    v_branch.f_uuid,
    true,
    null,
    null,
    date '1980-01-01',
    true,
    'green',
    'whatsapp',
    'qa-only-key-with-at-least-32-characters'
  );

  IF NOT EXISTS (
    SELECT 1 FROM api.t_consentimientos
    WHERE f_uuid_paciente = v_patient AND f_estado = 'active'
  ) THEN
    RAISE EXCEPTION 'No se creó consentimiento activo';
  END IF;
  RAISE NOTICE 'OK 1/9: paciente temporal y consentimiento creados';

  v_auto := api.fn_crear_plan_seguimiento(
    v_actor.f_idempresa, v_branch.f_idsucursal, v_actor.f_app,
    v_actor.f_email_principal, v_actor.f_rnc_principal, v_actor.f_uuid,
    v_patient, 'mapfre', current_date - 30,
    'QA Losartán 50 mg', 'Dra. QA', null, 'QA PROGRAMA AUTOMATICO',
    'ars_rule', null, 1, null, null, null
  );

  SELECT p.f_programacion_modo, p.f_numero_receta_actual,
         p.f_proxima_compra, p.f_fecha_contacto,
         r.f_cantidad_recetas
  INTO STRICT v_row
  FROM api.t_planes_seguimiento p
  JOIN api.t_reglas_ars r ON r.f_uuid = p.f_uuid_regla_ars
  WHERE p.f_uuid = v_auto;

  IF v_row.f_programacion_modo <> 'ars_rule'
     OR v_row.f_numero_receta_actual <> 1
     OR v_row.f_cantidad_recetas <> 6
     OR v_row.f_proxima_compra <> api.fn_fecha_mensual(current_date - 30, 1)
     OR v_row.f_fecha_contacto <> api.fn_fecha_mensual(current_date - 30, 1) - 7 THEN
    RAISE EXCEPTION 'Programación automática MAPFRE incorrecta';
  END IF;
  RAISE NOTICE 'OK 2/9: MAPFRE calculó 6 recetas y contacto 7 días antes';

  v_manual := api.fn_crear_plan_seguimiento(
    v_actor.f_idempresa, v_branch.f_idsucursal, v_actor.f_app,
    v_actor.f_email_principal, v_actor.f_rnc_principal, v_actor.f_uuid,
    v_patient, 'aps', v_first,
    'QA Metformina 850 mg', 'Dr. QA', null, 'QA PROGRAMA MANUAL',
    'manual', 4, 2, v_manual_last, v_manual_next, v_manual_contact
  );

  SELECT f_programacion_modo, f_cantidad_recetas_plan,
         f_numero_receta_actual, f_fecha_ultima_compra,
         f_proxima_compra, f_fecha_contacto
  INTO STRICT v_row
  FROM api.t_planes_seguimiento
  WHERE f_uuid = v_manual;

  IF v_row.f_programacion_modo <> 'manual'
     OR v_row.f_cantidad_recetas_plan <> 4
     OR v_row.f_numero_receta_actual <> 2
     OR v_row.f_fecha_ultima_compra <> v_manual_last
     OR v_row.f_proxima_compra <> v_manual_next
     OR v_row.f_fecha_contacto <> v_manual_contact THEN
    RAISE EXCEPTION 'Programación manual no conservó las fechas digitadas';
  END IF;
  RAISE NOTICE 'OK 3/9: programación manual conservó cantidad, receta y fechas';

  BEGIN
    PERFORM api.fn_crear_plan_seguimiento(
      v_actor.f_idempresa, v_branch.f_idsucursal, v_actor.f_app,
      v_actor.f_email_principal, v_actor.f_rnc_principal, v_actor.f_uuid,
      v_patient, 'idoppril', current_date - 10,
      'QA Amlodipino 10 mg', 'Dr. QA', null, 'QA PROGRAMA IDOPPRIL INVALIDO',
      'ars_rule', null, 1, null, null, null
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%Número de caso requerido para IDOPPRIL%' THEN
      RAISE;
    END IF;
    v_rejected := true;
  END;

  IF NOT v_rejected THEN
    RAISE EXCEPTION 'IDOPPRIL aceptó plan sin número de caso';
  END IF;
  RAISE NOTICE 'OK 4/9: IDOPPRIL rechazó correctamente la ausencia de caso';

  v_case := api.fn_crear_plan_seguimiento(
    v_actor.f_idempresa, v_branch.f_idsucursal, v_actor.f_app,
    v_actor.f_email_principal, v_actor.f_rnc_principal, v_actor.f_uuid,
    v_patient, 'idoppril', current_date - 10,
    'QA Amlodipino 10 mg', 'Dr. QA', 'CASO-QA-001', 'QA PROGRAMA IDOPPRIL',
    'ars_rule', null, 1, null, null, null
  );

  SELECT f_numero_caso, f_proxima_compra, f_fecha_contacto
  INTO STRICT v_row
  FROM api.t_planes_seguimiento
  WHERE f_uuid = v_case;

  IF v_row.f_numero_caso <> 'CASO-QA-001'
     OR v_row.f_proxima_compra IS NOT NULL
     OR v_row.f_fecha_contacto IS NOT NULL THEN
    RAISE EXCEPTION 'Plan IDOPPRIL por caso incorrecto';
  END IF;
  RAISE NOTICE 'OK 5/9: IDOPPRIL creó seguimiento por caso sin calendario mensual';

  SELECT count(*) INTO v_count
  FROM api.fn_consultar_planes_seguimiento(
    v_actor.f_idempresa, v_actor.f_app, 'Paciente Temporal Programa',
    'all', '', '70', 25, 0
  );
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'La agenda esperaba 3 planes y devolvió %', v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM api.fn_consultar_planes_seguimiento(
    v_actor.f_idempresa + 999, v_actor.f_app, 'Paciente Temporal Programa',
    'all', '', '', 25, 0
  );
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Fallo de aislamiento tenant en consulta de planes';
  END IF;
  RAISE NOTICE 'OK 6/9: agenda encontró 3 planes y aisló otro tenant';

  PERFORM api.fn_registrar_resultado_seguimiento(
    v_actor.f_idempresa, v_actor.f_app, v_auto,
    'no_contesto', 'whatsapp', 'QA sin respuesta', current_date + 2,
    v_actor.f_uuid
  );

  IF NOT EXISTS (
    SELECT 1 FROM api.t_contactos_seguimiento
    WHERE f_uuid_plan = v_auto
      AND f_resultado = 'no_contesto'
      AND f_proxima_accion_en = current_date + 2
  ) OR NOT EXISTS (
    SELECT 1 FROM api.t_planes_seguimiento
    WHERE f_uuid = v_auto
      AND f_ultimo_resultado = 'no_contesto'
      AND f_fecha_contacto = current_date + 2
  ) THEN
    RAISE EXCEPTION 'Resultado no_contesto no actualizó historial y próxima acción';
  END IF;
  RAISE NOTICE 'OK 7/9: resultado no_contesto creó historial y reprogramó contacto';

  v_rejected := false;
  BEGIN
    PERFORM api.fn_registrar_resultado_seguimiento(
      v_actor.f_idempresa, v_actor.f_app, v_manual,
      'compro', 'call', 'QA compra sin dispensación', null, v_actor.f_uuid
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%Compra requiere dispensación%' THEN RAISE; END IF;
    v_rejected := true;
  END;
  IF NOT v_rejected THEN
    RAISE EXCEPTION 'El resultado compró avanzó el plan sin dispensación';
  END IF;
  SELECT f_numero_receta_actual, f_estado
  INTO STRICT v_row FROM api.t_planes_seguimiento WHERE f_uuid = v_manual;
  IF v_row.f_numero_receta_actual <> 2 OR v_row.f_estado <> 'active' THEN
    RAISE EXCEPTION 'El intento bloqueado alteró el plan manual';
  END IF;
  RAISE NOTICE 'OK 8/9: compra sin dispensación fue bloqueada sin alterar el plan';

  SELECT count(*) INTO v_count
  FROM api.t_contactos_seguimiento
  WHERE f_uuid_plan IN (v_auto, v_manual, v_case);
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Se esperaba 1 contacto temporal y hay %', v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM api.t_planes_seguimiento
  WHERE f_uuid_paciente = v_patient;
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'Se esperaban 3 planes temporales y hay %', v_count;
  END IF;
  RAISE NOTICE 'OK 9/9: conteos transaccionales correctos (3 planes, 1 contacto)';
END
$test$;

-- Elimina paciente, consentimiento, planes y contactos creados por esta prueba.
ROLLBACK;
