"use client";

import { Search, UserPlus, UsersRound } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { AsyncView } from "@/components/ui/AsyncView";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { contrasenaValida, validarEmail, type Errores } from "@/features/auth/validacion";
import { useFormularioPerfil } from "@/features/perfil/useFormularioPerfil";
import { opcionesDe } from "@/features/proyectos/comunes";
import { api } from "@/lib/api/endpoints";
import type { AdministradorInput, Rol, UsuarioAdmin } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatearFecha } from "@/lib/format";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { ROL_ETIQUETA } from "@/lib/labels";

const TAMANO = 20;
const REGLA_CONTRASENA = "Al menos 8 caracteres, con una letra y un número.";

interface Filtros {
  rol: Rol | "";
  /** "" = todos; el select trabaja con texto y se convierte a booleano al pedir. */
  activo: "" | "true" | "false";
  q: string;
}

const SIN_FILTROS: Filtros = { rol: "", activo: "", q: "" };

const nombreCompleto = (u: UsuarioAdmin) => `${u.nombre} ${u.apellido}`;

/** `/admin/usuarios`: listado paginado con filtros, activar o desactivar, cambiar el rol, restablecer la contraseña y alta de administradores. */
export function UsuariosAdminPage() {
  const { usuario: yo } = useAuth();
  const toast = useToast();
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [texto, setTexto] = useState("");
  const [pagina, setPagina] = useState(1);
  const [aCambiarEstado, setACambiarEstado] = useState<UsuarioAdmin | null>(null);
  const [aCambiarRol, setACambiarRol] = useState<UsuarioAdmin | null>(null);
  const [rolNuevo, setRolNuevo] = useState<Rol>("estudiante");
  const [aRestablecer, setARestablecer] = useState<UsuarioAdmin | null>(null);
  const [contrasena, setContrasena] = useState("");
  const [creando, setCreando] = useState(false);

  const consulta = useApiQuery(
    `admin:usuarios:${JSON.stringify([filtros, pagina])}`,
    (signal) =>
      api.admin.usuarios(
        {
          rol: filtros.rol || undefined,
          activo: filtros.activo === "" ? undefined : filtros.activo === "true",
          q: filtros.q || undefined,
          pagina,
          tamano: TAMANO,
        },
        { signal },
      ),
    { esVacio: (datos) => datos.items.length === 0 },
  );

  /** Cada cambio de filtro vuelve a la primera página. */
  function filtrar(parcial: Partial<Filtros>) {
    setFiltros((actuales) => ({ ...actuales, ...parcial }));
    setPagina(1);
  }

  function limpiar() {
    setFiltros(SIN_FILTROS);
    setTexto("");
    setPagina(1);
  }

  // El backend responde 409 si un administrador intenta desactivarse o cambiarse el rol a sí mismo:
  // el diálogo muestra ese mensaje tal cual (ConfirmDialog sigue abierto cuando la acción falla).
  async function cambiarEstado(u: UsuarioAdmin) {
    await api.admin.actualizarUsuario(u.idUsuario, { activo: !u.activo });
    toast.exito(
      u.activo ? `${nombreCompleto(u)} ya no puede iniciar sesión.` : `${nombreCompleto(u)} puede volver a iniciar sesión.`,
      u.activo ? "Usuario desactivado" : "Usuario activado",
    );
    consulta.recargar();
  }

  async function cambiarRol(u: UsuarioAdmin) {
    await api.admin.actualizarUsuario(u.idUsuario, { rol: rolNuevo });
    toast.exito(`${nombreCompleto(u)} ahora es ${ROL_ETIQUETA[rolNuevo]}.`, "Rol actualizado");
    consulta.recargar();
  }

  async function restablecer(u: UsuarioAdmin) {
    await api.admin.restablecerContrasena(u.idUsuario, { contrasenaNueva: contrasena });
    toast.exito(`Pasale la contraseña nueva a ${nombreCompleto(u)} por un canal seguro.`, "Contraseña restablecida");
  }

  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(SIN_FILTROS);

  return (
    <>
      <PageHeader
        etiqueta="Administración"
        titulo="Usuarios"
        descripcion="Activá o desactivá cuentas, cambiá roles, restablecé contraseñas y dá de alta administradores."
        acciones={
          <Button iconoIzquierda={<UserPlus aria-hidden="true" className="size-5" />} onClick={() => setCreando(true)}>
            Nuevo administrador
          </Button>
        }
      />

      <Card como="section" variante="plana" aria-label="Filtros" className="mb-6">
        <form
          role="search"
          aria-label="Buscar usuarios"
          onSubmit={(evento) => {
            evento.preventDefault();
            filtrar({ q: texto.trim() });
          }}
          className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-end"
        >
          <div className="flex items-end gap-3">
            <Input
              className="flex-1"
              type="search"
              label="Nombre o email"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <Button type="submit" iconoIzquierda={<Search aria-hidden="true" className="size-4" />}>
              Buscar
            </Button>
          </div>
          <Select
            label="Rol"
            placeholder="Todos"
            opciones={opcionesDe(ROL_ETIQUETA)}
            value={filtros.rol}
            onChange={(e) => filtrar({ rol: e.target.value as Rol | "" })}
          />
          <Select
            label="Estado"
            placeholder="Todos"
            opciones={[
              { valor: "true", etiqueta: "Activos" },
              { valor: "false", etiqueta: "Inactivos" },
            ]}
            value={filtros.activo}
            onChange={(e) => filtrar({ activo: e.target.value as Filtros["activo"] })}
          />
        </form>
        {hayFiltros && (
          <Button variante="ghost" tamano="sm" className="mt-3" onClick={limpiar}>
            Limpiar filtros
          </Button>
        )}
      </Card>

      <AsyncView
        consulta={consulta}
        etiquetaCarga="Cargando usuarios"
        tituloError="No pudimos cargar los usuarios"
        vacio={
          <EmptyState
            icono={<UsersRound className="size-7" />}
            titulo="No encontramos usuarios"
            descripcion="Ningún usuario cumple con esos filtros."
            accion={<Button onClick={limpiar}>Ver todos los usuarios</Button>}
          />
        }
      >
        {(datos) => (
          <>
            <p role="status" className="mb-3 text-sm text-muted">
              {datos.total} {datos.total === 1 ? "usuario" : "usuarios"}
            </p>
            <DataTable
              caption="Usuarios de la plataforma"
              filas={datos.items}
              idDeFila={(u) => u.idUsuario}
              columnas={[
                {
                  clave: "usuario",
                  titulo: "Usuario",
                  celda: (u) => (
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {nombreCompleto(u)}
                        {u.idUsuario === yo?.idUsuario && <Badge variante="accent">Vos</Badge>}
                      </p>
                      <p className="text-sm text-muted">{u.email}</p>
                    </div>
                  ),
                },
                { clave: "rol", titulo: "Rol", celda: (u) => ROL_ETIQUETA[u.rol] },
                {
                  clave: "estado",
                  titulo: "Estado",
                  celda: (u) => <Badge variante={u.activo ? "success" : "neutral"}>{u.activo ? "Activo" : "Inactivo"}</Badge>,
                },
                { clave: "registro", titulo: "Registro", celda: (u) => formatearFecha(u.fechaRegistro) },
                {
                  clave: "acciones",
                  titulo: "Acciones",
                  alinear: "derecha",
                  celda: (u) => (
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variante={u.activo ? "secondary" : "primary"}
                        tamano="sm"
                        aria-label={`${u.activo ? "Desactivar" : "Activar"} a ${nombreCompleto(u)}`}
                        onClick={() => setACambiarEstado(u)}
                      >
                        {u.activo ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        variante="ghost"
                        tamano="sm"
                        aria-label={`Cambiar rol de ${nombreCompleto(u)}`}
                        onClick={() => {
                          setRolNuevo(u.rol);
                          setACambiarRol(u);
                        }}
                      >
                        Cambiar rol
                      </Button>
                      <Button
                        variante="ghost"
                        tamano="sm"
                        aria-label={`Restablecer contraseña de ${nombreCompleto(u)}`}
                        onClick={() => {
                          setContrasena("");
                          setARestablecer(u);
                        }}
                      >
                        Restablecer contraseña
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
            {datos.total > TAMANO && (
              <Pagination className="mt-6" pagina={datos.pagina} tamano={datos.tamano} total={datos.total} alCambiar={setPagina} />
            )}
          </>
        )}
      </AsyncView>

      <ConfirmDialog
        abierto={aCambiarEstado !== null}
        alCerrar={() => setACambiarEstado(null)}
        titulo={aCambiarEstado ? `¿${aCambiarEstado.activo ? "Desactivar" : "Activar"} a ${nombreCompleto(aCambiarEstado)}?` : ""}
        descripcion={
          aCambiarEstado?.activo
            ? "No va a poder iniciar sesión y pierde la sesión abierta en el momento. Sus datos se conservan." +
              (aCambiarEstado.rol === "empresa" || aCambiarEstado.rol === "docente"
                ? " Sus proyectos publicados o en curso se suspenden; después los reactivás desde Proyectos."
                : "")
            : "Va a poder volver a iniciar sesión con su contraseña."
        }
        textoConfirmar={aCambiarEstado?.activo ? "Sí, desactivar" : "Sí, activar"}
        variante={aCambiarEstado?.activo ? "danger" : "primary"}
        alConfirmar={() => (aCambiarEstado ? cambiarEstado(aCambiarEstado) : Promise.resolve())}
      />

      <ConfirmDialog
        abierto={aCambiarRol !== null}
        alCerrar={() => setACambiarRol(null)}
        titulo={aCambiarRol ? `Cambiar el rol de ${nombreCompleto(aCambiarRol)}` : ""}
        descripcion="El rol define qué pantallas ve y qué puede hacer en la plataforma."
        textoConfirmar="Guardar rol"
        confirmarDeshabilitado={rolNuevo === aCambiarRol?.rol}
        alConfirmar={() => (aCambiarRol ? cambiarRol(aCambiarRol) : Promise.resolve())}
      >
        <Select
          label="Nuevo rol"
          opciones={opcionesDe(ROL_ETIQUETA)}
          value={rolNuevo}
          onChange={(e) => setRolNuevo(e.target.value as Rol)}
        />
      </ConfirmDialog>

      <ConfirmDialog
        abierto={aRestablecer !== null}
        alCerrar={() => setARestablecer(null)}
        titulo={aRestablecer ? `Restablecer la contraseña de ${nombreCompleto(aRestablecer)}` : ""}
        descripcion="La contraseña actual deja de funcionar. Pasale la nueva por un canal seguro."
        textoConfirmar="Restablecer"
        confirmarDeshabilitado={!contrasenaValida(contrasena)}
        alConfirmar={() => (aRestablecer ? restablecer(aRestablecer) : Promise.resolve())}
      >
        <PasswordInput
          label="Contraseña nueva"
          hint={REGLA_CONTRASENA}
          autoComplete="new-password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />
      </ConfirmDialog>

      {creando && (
        <NuevoAdministrador
          alCerrar={() => setCreando(false)}
          alCrear={(nombre) => {
            setCreando(false);
            toast.exito(`${nombre} ya puede ingresar como administrador.`, "Administrador creado");
            consulta.recargar();
          }}
        />
      )}
    </>
  );
}

type CampoAdministrador = keyof AdministradorInput;
const ORDEN: readonly CampoAdministrador[] = ["nombre", "apellido", "email", "contrasena"];

function validarAdministrador(v: AdministradorInput): Errores<CampoAdministrador> {
  const errores: Errores<CampoAdministrador> = {};
  if (!v.nombre.trim()) errores.nombre = "Ingresá el nombre.";
  if (!v.apellido.trim()) errores.apellido = "Ingresá el apellido.";
  const email = v.email.trim() ? validarEmail(v.email) : "Ingresá el email.";
  if (email) errores.email = email;
  if (!contrasenaValida(v.contrasena)) errores.contrasena = `La contraseña debe tener: ${REGLA_CONTRASENA.toLowerCase()}`;
  return errores;
}

/** Alta de un administrador. Se monta al abrirse, así el formulario arranca vacío cada vez. */
function NuevoAdministrador({ alCerrar, alCrear }: { alCerrar: () => void; alCrear: (nombre: string) => void }) {
  const [valores, setValores] = useState<AdministradorInput>({ nombre: "", apellido: "", email: "", contrasena: "" });
  const { errores, errorGeneral, enviando, formulario, alEnviar } = useFormularioPerfil({
    valores,
    validar: validarAdministrador,
    orden: ORDEN,
    construirPayload: (v) => ({ nombre: v.nombre.trim(), apellido: v.apellido.trim(), email: v.email.trim(), contrasena: v.contrasena }),
    alGuardar: async (payload) => {
      await api.admin.crearAdministrador(payload);
      alCrear(`${payload.nombre} ${payload.apellido}`);
    },
  });
  const campo = (nombre: CampoAdministrador) => ({
    name: nombre,
    value: valores[nombre],
    error: errores[nombre],
    required: true,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValores((v) => ({ ...v, [nombre]: e.target.value })),
  });

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo="Nuevo administrador"
      descripcion="Tiene acceso completo al panel de administración."
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="form-nuevo-administrador" cargando={enviando}>
            Crear administrador
          </Button>
        </>
      }
    >
      <form id="form-nuevo-administrador" ref={formulario} onSubmit={alEnviar} noValidate className="flex flex-col gap-4">
        {errorGeneral && <Alert variante="danger">{errorGeneral}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre" maxLength={80} autoComplete="off" {...campo("nombre")} />
          <Input label="Apellido" maxLength={80} autoComplete="off" {...campo("apellido")} />
        </div>
        <Input label="Email" type="email" maxLength={160} autoComplete="off" {...campo("email")} />
        <PasswordInput label="Contraseña inicial" hint={REGLA_CONTRASENA} autoComplete="new-password" {...campo("contrasena")} />
      </form>
    </Modal>
  );
}
