begin;

alter table api.t_perfiles
  drop constraint if exists profiles_role_check;

alter table api.t_perfiles
  add constraint profiles_role_check
  check (f_rol in (
    'administrator',
    'coordinator',
    'pharmacist',
    'inventory',
    'attention',
    'physician',
    'direction'
  ));

comment on constraint profiles_role_check on api.t_perfiles is
  'Roles de personal; physician tiene consulta de pacientes y seguimiento en la aplicación.';

commit;