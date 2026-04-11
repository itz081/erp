# Backend ERP Tickets de Seguridad

Backend completo con 4 microservicios + API Gateway usando **Fastify** y **PostgreSQL**.

## Arquitectura

```
API Gateway (puerto 3000)
├── /api/auth       → Users Service (3001)
├── /api/users      → Users Service (3001)
├── /api/permissions → Users Service (3001)
├── /api/tickets    → Tickets Service (3002)
├── /api/comentarios → Tickets Service (3002)
├── /api/historial  → Tickets Service (3002)
├── /api/groups     → Groups Service (3003)
└── /api/members    → Groups Service (3003)
```

## Requisitos

- Node.js >= 18
- PostgreSQL >= 14
- npm >= 8

## Instalación

### 1. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL
```

### 2. Instalar dependencias

```bash
cd backend

# Instalar dependencias de todos los servicios
npm install --prefix users
npm install --prefix tickets
npm install --prefix groups
npm install --prefix apigateway
npm install --prefix scripts
```

### 3. Configurar base de datos

```bash
cd backend
node scripts/db-setup.js
```

Esto crea la base de datos `ANA` con todas las tablas y datos seed.

### 4. Iniciar servicios

Abre **4 terminales** y ejecuta:

```bash
# Terminal 1 - Users Service
cd backend/users && npm run dev

# Terminal 2 - Tickets Service  
cd backend/tickets && npm run dev

# Terminal 3 - Groups Service
cd backend/groups && npm run dev

# Terminal 4 - API Gateway
cd backend/apigateway && npm run dev
```

O con concurrently (instalar en raíz):
```bash
cd backend && npm install && npm run dev
```

## API Endpoints (todos via Gateway en puerto 3000)

### Auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET  | `/api/auth/me` | Usuario actual |

### Usuarios
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/users` | Listar usuarios |
| GET    | `/api/users/:id` | Detalle usuario |
| PUT    | `/api/users/:id` | Actualizar usuario |
| PUT    | `/api/users/:id/permisos` | Cambiar permisos globales |
| PUT    | `/api/users/:id/password` | Cambiar contraseña |
| DELETE | `/api/users/:id` | Eliminar usuario |

### Tickets
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/tickets?grupo_id=&estado_id=` | Listar/filtrar tickets |
| GET    | `/api/tickets/:id` | Detalle ticket |
| POST   | `/api/tickets` | Crear ticket |
| PUT    | `/api/tickets/:id` | Actualizar ticket |
| DELETE | `/api/tickets/:id` | Eliminar ticket |
| GET    | `/api/tickets/catalogs/estados` | Catálogo de estados |
| GET    | `/api/tickets/catalogs/prioridades` | Catálogo de prioridades |

### Comentarios
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/comentarios/ticket/:id` | Comentarios de ticket |
| POST   | `/api/comentarios/ticket/:id` | Agregar comentario |
| DELETE | `/api/comentarios/:id` | Eliminar comentario |

### Grupos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/groups?all=true` | Listar grupos (mis grupos o todos) |
| GET    | `/api/groups/:id` | Detalle grupo |
| POST   | `/api/groups` | Crear grupo |
| PUT    | `/api/groups/:id` | Actualizar grupo |
| DELETE | `/api/groups/:id` | Eliminar grupo |
| GET    | `/api/groups/:id/stats` | Estadísticas del grupo |

### Miembros
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/members/grupo/:grupoId` | Miembros del grupo |
| POST   | `/api/members/grupo/:grupoId/usuario/:userId` | Agregar miembro |
| DELETE | `/api/members/grupo/:grupoId/usuario/:userId` | Remover miembro |
| GET    | `/api/members/grupo/:grupoId/usuario/:userId/permisos` | Permisos del usuario en grupo |
| PUT    | `/api/members/grupo/:grupoId/usuario/:userId/permisos` | Actualizar permisos en grupo |

## Formato de Respuesta Universal

```json
{
  "statusCode": 200,
  "intOpCode": "SxUS200",
  "data": { }
}
```

## Permisos del Sistema

| Permiso | Descripción |
|---------|-------------|
| `tickets:add` | Crear nuevos tickets |
| `tickets:edit` | Editar tickets |
| `tickets:delete` | Eliminar tickets |
| `tickets:move` | Cambiar estado (requiere estar asignado) |
| `tickets:comment` | Comentar en tickets |
| `groups:manage` | Administrar grupos y miembros |
| `users:manage` | Administrar usuarios y permisos |

## Seguridad

- **JWT** en cookies httpOnly + header Authorization
- **Rate Limiting**: 100 req/min por IP
- **Bcrypt** para contraseñas (10 rounds)
- **Validación** de entrada en cada endpoint
- **CORS** configurado para el frontend Angular
