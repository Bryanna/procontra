-- Datos anonimizados para validar el reporte de seguimiento SENASA.
-- No contiene nombres ni teléfonos reales del libro fuente.
begin;

do $$
declare
  v_actor record;
  v_rule uuid;
begin
  select f_idempresa,f_idsucursal,f_app,f_uuid,f_email_principal,f_rnc_principal
  into strict v_actor
  from api.t_perfiles
  where f_rol='administrator'
  order by f_id
  limit 1;

  select f_uuid into strict v_rule
  from api.t_reglas_ars
  where f_idempresa=0 and f_app=0 and f_codigo='senasa' and f_activa;

  with demo(code,name,phone,branch_code,medicines,doctor,contact_offset,result,source_row,note) as (values
    ('DEMO-SENASA-001','PRUEBA SENASA 01','809-555-1001','01','JARINU 25 MG','Médico de prueba 01',0,'contesto',107,'Caso anonimizado para validar contacto confirmado'),
    ('DEMO-SENASA-002','PRUEBA SENASA 02','809-555-1002','70','RAPIBLOK 5 ML','Médico de prueba 02',-4,'no_contesto',108,'Caso anonimizado para validar seguimiento atrasado'),
    ('DEMO-SENASA-003','PRUEBA SENASA 03','809-555-1003','70','IBERPRODOL 10 MG','Médico de prueba 03',1,'ya_tiene_receta',109,'Caso anonimizado con receta disponible'),
    ('DEMO-SENASA-004','PRUEBA SENASA 04','809-555-1004','70','GLUDEN XR 500, CANDAX 16 MG','Médico de prueba 04',-2,'no_tiene_receta',110,'Caso anonimizado sin receta'),
    ('DEMO-SENASA-005','PRUEBA SENASA 05','809-555-1005','70','VALDIBER TRES 160/5/12.5, RUSARTE 20 MG','Médico de prueba 05',3,'tiene_cita_medica',111,'Caso anonimizado con cita médica'),
    ('DEMO-SENASA-006','PRUEBA SENASA 06','809-555-1006','70','HIDROCARD 25, TIAMINAL TRIV B12','Médico de prueba 06',5,'esperando_autorizacion',112,'Caso anonimizado esperando autorización'),
    ('DEMO-SENASA-007','PRUEBA SENASA 07','809-555-1007','70','CILENOL 2.5, CEUMID 100, APIXCARD 5','Médico de prueba 07',7,'comprara_efectivo',113,'Caso anonimizado con compra en efectivo prevista'),
    ('DEMO-SENASA-008','PRUEBA SENASA 08','809-555-1008','70','ALLEANCE OFT. PF','Médico de prueba 08',0,'volver_a_llamar',114,'Caso anonimizado para volver a llamar'),
    ('DEMO-SENASA-009','PRUEBA SENASA 09','809-555-1009','70','ORATOR 20 MG','Médico de prueba 09',2,'enviar_a_casa',115,'Caso anonimizado para entrega a domicilio'),
    ('DEMO-SENASA-010','PRUEBA SENASA 10','809-555-1010','81','VERTIX 16, ENALAPRIL 10 MG LAM','Médico de prueba 10',-1,null,116,'Caso anonimizado sin contacto registrado'),
    ('DEMO-SENASA-011','PRUEBA SENASA 11','809-555-1011','48','SOSTENON 250 AMP','Médico de prueba 11',6,'no_contesto',145,'Caso anonimizado para segundo intento'),
    ('DEMO-SENASA-012','PRUEBA SENASA 12','809-555-1012','81','IBEROTIL 1000 MG','Médico de prueba 12',10,'volver_a_llamar',206,'Resultado del origen normalizado como volver a llamar')
  )
  insert into api.t_pacientes(
    f_codigo_interno,f_nombre_completo,f_telefono,f_uuid_sucursal_preferida,f_aseguradora,
    f_activo,f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app,
    f_estado_seguimiento,f_canal_contacto_preferido
  )
  select d.code,d.name,d.phone,s.f_uuid,'ARS SENASA',true,
    v_actor.f_email_principal,v_actor.f_rnc_principal,v_actor.f_idempresa,s.f_id,v_actor.f_app,
    'yellow','call'
  from demo d
  join api.t_sucursales s on s.f_idempresa=v_actor.f_idempresa and s.f_app=v_actor.f_app and s.f_codigo=d.branch_code
  on conflict (f_idempresa,f_idsucursal,f_app,f_codigo_interno) do update set
    f_nombre_completo=excluded.f_nombre_completo,
    f_telefono=excluded.f_telefono,
    f_uuid_sucursal_preferida=excluded.f_uuid_sucursal_preferida,
    f_aseguradora=excluded.f_aseguradora,
    f_activo=true,
    f_actualizado_en=now();

  with demo(code,medicines,doctor,contact_offset,result,source_row,note) as (values
    ('DEMO-SENASA-001','JARINU 25 MG','Médico de prueba 01',0,'contesto',107,'Caso anonimizado para validar contacto confirmado'),
    ('DEMO-SENASA-002','RAPIBLOK 5 ML','Médico de prueba 02',-4,'no_contesto',108,'Caso anonimizado para validar seguimiento atrasado'),
    ('DEMO-SENASA-003','IBERPRODOL 10 MG','Médico de prueba 03',1,'ya_tiene_receta',109,'Caso anonimizado con receta disponible'),
    ('DEMO-SENASA-004','GLUDEN XR 500, CANDAX 16 MG','Médico de prueba 04',-2,'no_tiene_receta',110,'Caso anonimizado sin receta'),
    ('DEMO-SENASA-005','VALDIBER TRES 160/5/12.5, RUSARTE 20 MG','Médico de prueba 05',3,'tiene_cita_medica',111,'Caso anonimizado con cita médica'),
    ('DEMO-SENASA-006','HIDROCARD 25, TIAMINAL TRIV B12','Médico de prueba 06',5,'esperando_autorizacion',112,'Caso anonimizado esperando autorización'),
    ('DEMO-SENASA-007','CILENOL 2.5, CEUMID 100, APIXCARD 5','Médico de prueba 07',7,'comprara_efectivo',113,'Caso anonimizado con compra en efectivo prevista'),
    ('DEMO-SENASA-008','ALLEANCE OFT. PF','Médico de prueba 08',0,'volver_a_llamar',114,'Caso anonimizado para volver a llamar'),
    ('DEMO-SENASA-009','ORATOR 20 MG','Médico de prueba 09',2,'enviar_a_casa',115,'Caso anonimizado para entrega a domicilio'),
    ('DEMO-SENASA-010','VERTIX 16, ENALAPRIL 10 MG LAM','Médico de prueba 10',-1,null,116,'Caso anonimizado sin contacto registrado'),
    ('DEMO-SENASA-011','SOSTENON 250 AMP','Médico de prueba 11',6,'no_contesto',145,'Caso anonimizado para segundo intento'),
    ('DEMO-SENASA-012','IBEROTIL 1000 MG','Médico de prueba 12',10,'volver_a_llamar',206,'Resultado del origen normalizado como volver a llamar')
  )
  insert into api.t_planes_seguimiento(
    f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app,f_uuid_paciente,f_uuid_regla_ars,
    f_medicamentos,f_medico,f_fecha_primera_compra,f_fecha_ultima_compra,f_numero_receta_actual,
    f_proxima_compra,f_fecha_contacto,f_estado,f_ultimo_resultado,f_observaciones,f_creado_por,
    f_programacion_modo,f_cantidad_recetas_plan,f_es_prueba,f_fuente_referencia
  )
  select v_actor.f_email_principal,v_actor.f_rnc_principal,v_actor.f_idempresa,p.f_idsucursal,v_actor.f_app,
    p.f_uuid,v_rule,d.medicines,d.doctor,current_date-interval '1 month',current_date-interval '1 month',1,
    current_date+d.contact_offset+7,current_date+d.contact_offset,'active',d.result,
    '[DATOS DE PRUEBA SENASA] '||d.note,v_actor.f_uuid,'manual',3,true,
    'CONTROL DE USO CONTINUO ARS SENASA2.xlsx · fila '||d.source_row
  from demo d
  join api.t_pacientes p on p.f_idempresa=v_actor.f_idempresa and p.f_app=v_actor.f_app and p.f_codigo_interno=d.code
  where not exists (
    select 1 from api.t_planes_seguimiento pl
    where pl.f_idempresa=v_actor.f_idempresa and pl.f_app=v_actor.f_app
      and pl.f_uuid_paciente=p.f_uuid and pl.f_es_prueba
  );

  with demo(code,result,note) as (values
    ('DEMO-SENASA-001','contesto','Caso anonimizado para validar contacto confirmado'),
    ('DEMO-SENASA-002','no_contesto','Caso anonimizado para validar seguimiento atrasado'),
    ('DEMO-SENASA-003','ya_tiene_receta','Caso anonimizado con receta disponible'),
    ('DEMO-SENASA-004','no_tiene_receta','Caso anonimizado sin receta'),
    ('DEMO-SENASA-005','tiene_cita_medica','Caso anonimizado con cita médica'),
    ('DEMO-SENASA-006','esperando_autorizacion','Caso anonimizado esperando autorización'),
    ('DEMO-SENASA-007','comprara_efectivo','Caso anonimizado con compra en efectivo prevista'),
    ('DEMO-SENASA-008','volver_a_llamar','Caso anonimizado para volver a llamar'),
    ('DEMO-SENASA-009','enviar_a_casa','Caso anonimizado para entrega a domicilio'),
    ('DEMO-SENASA-011','no_contesto','Caso anonimizado para segundo intento'),
    ('DEMO-SENASA-012','volver_a_llamar','Resultado del origen normalizado como volver a llamar')
  )
  insert into api.t_contactos_seguimiento(
    f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app,f_uuid_plan,
    f_fecha_contacto,f_canal,f_resultado,f_observaciones,f_registrado_por
  )
  select pl.f_email_principal,pl.f_rnc_principal,pl.f_idempresa,pl.f_idsucursal,pl.f_app,pl.f_uuid,
    now(),'call',d.result,'[DATOS DE PRUEBA SENASA] '||d.note,v_actor.f_uuid
  from demo d
  join api.t_pacientes p on p.f_idempresa=v_actor.f_idempresa and p.f_app=v_actor.f_app and p.f_codigo_interno=d.code
  join api.t_planes_seguimiento pl on pl.f_uuid_paciente=p.f_uuid and pl.f_es_prueba
  where not exists (
    select 1 from api.t_contactos_seguimiento c
    where c.f_uuid_plan=pl.f_uuid and c.f_observaciones='[DATOS DE PRUEBA SENASA] '||d.note
  );
end $$;

commit;
