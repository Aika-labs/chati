# Chati

Plataforma SaaS multi-tenant para automatización de WhatsApp con IA, RAG, CRM y calendario.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│                     React 19 + Vite + TailwindCSS                       │
│         Landing | Auth | Dashboard | Chat | CRM | Calendar              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                     │
│                    Express + TypeScript + Prisma                        │
├─────────────────────────────────────────────────────────────────────────┤
│  Módulos:                                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │   Auth   │ │  Tenant  │ │ WhatsApp │ │    AI    │ │ AutoReply│     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │   RAG    │ │Knowledge │ │ Calendar │ │ Contacts │ │ Realtime │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  PostgreSQL  │ │    Redis     │ │   Supabase   │ │   BullMQ     │
│  + pgvector  │ │   (Cache)    │ │  (Storage)   │ │   (Jobs)     │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

## Stack Tecnológico

### Backend
| Tecnología | Uso |
|------------|-----|
| Node.js 20+ | Runtime |
| Express 4 | Framework HTTP |
| TypeScript 5 | Tipado estático |
| Prisma 5 | ORM + Migraciones |
| PostgreSQL | Base de datos principal |
| pgvector | Embeddings para RAG |
| Redis | Cache + Rate limiting |
| BullMQ | Cola de trabajos |
| Socket.io | Tiempo real |
| Groq (LLaMA 3.3 70B) | IA conversacional |
| Zod | Validación de schemas |

### Frontend
| Tecnología | Uso |
|------------|-----|
| React 19 | UI Framework |
| Vite 7 | Build tool |
| TailwindCSS 3 | Estilos |
| TanStack Query | Server state |
| Zustand | Client state |
| React Hook Form | Formularios |
| Framer Motion | Animaciones |
| Lucide | Iconos |

### Infraestructura
| Tecnología | Uso |
|------------|-----|
| Pulumi | IaC |
| Hetzner Cloud | VPS (CPX31: 4 vCPU, 8GB RAM) |
| Docker Compose | Orquestación |
| Traefik | Reverse proxy + SSL |
| Pulumi ESC | Gestión de secretos |
| GitHub Actions | CI/CD |

## Módulos del Backend

### Auth (`/api/auth`)
- Login/Register con JWT
- Refresh tokens
- Google OAuth para Calendar/Sheets

### Tenant (`/api/tenants`)
- Multi-tenancy con aislamiento por tenant
- Planes: FREE, STARTER, PRO, ENTERPRISE
- Estados: TRIAL, ACTIVE, SUSPENDED, BANNED
- Límites configurables por tenant

### WhatsApp (`/api/whatsapp`)
- Webhook para Meta Business API
- Envío de mensajes: texto, templates, botones, listas
- Estados de mensaje: PENDING → SENT → DELIVERED → READ

### AI (`/api/ai`)
- Procesamiento de mensajes con Groq
- Detección de intenciones: schedule, query_price, greeting, etc.
- Circuit breaker para resiliencia
- Contexto de conversación (últimos 10 mensajes)

### AutoReply (`/api/autoreply`)
- Respuestas automáticas SIN usar IA (ahorra tokens)
- Tipos de trigger:
  - `KEYWORD`: Coincidencia por palabras clave
  - `PATTERN`: Expresiones regulares
  - `GREETING`: Saludos built-in (hola, hello, buenos días...)
  - `THANKS`: Agradecimientos built-in (gracias, thank you...)
  - `GOODBYE`: Despedidas built-in (adiós, bye, hasta luego...)
- Cache en Redis (5 min TTL)
- Prioridad configurable
- Estadísticas de uso

### RAG (`/api/rag`)
- Upload de documentos: PDF, Excel, CSV, TXT
- Chunking con overlap
- Embeddings con pgvector (1536 dimensiones)
- Búsqueda semántica

### Knowledge (`/api/knowledge`)
- Integración con Google Sheets
- Sync de productos y servicios
- CRUD de productos/servicios

### Calendar (`/api/calendar`)
- Slots de disponibilidad
- Gestión de citas
- Recordatorios automáticos (24h, 1h)
- Sync con Google Calendar

### Contacts (`/api/contacts`)
- CRM básico
- Tags y scoring
- Historial de conversaciones

### Realtime
- Socket.io para eventos en tiempo real
- Eventos: `new_message`, `handoff_requested`, `typing`

## Flujo de Mensajes

```
WhatsApp → Webhook → AutoReply Check → [Match?]
                                          │
                          ┌───────────────┴───────────────┐
                          ▼                               ▼
                    [Sí: Match]                     [No: Sin match]
                          │                               │
                          ▼                               ▼
                   Enviar AutoReply              Procesar con IA
                   (0 tokens IA)                 (consume tokens)
                          │                               │
                          └───────────────┬───────────────┘
                                          ▼
                                   Guardar mensaje
                                   Emitir evento Socket.io
                                   Actualizar conversación
```

## Base de Datos

### Modelos Principales

```prisma
Tenant          # Organización/empresa
User            # Usuarios del tenant
Contact         # Contactos de WhatsApp
Conversation    # Hilos de conversación
Message         # Mensajes individuales
Appointment     # Citas agendadas
Document        # Documentos RAG
DocumentChunk   # Chunks con embeddings
Product         # Catálogo de productos
Service         # Catálogo de servicios
AutoReply       # Reglas de auto-respuesta
UsageRecord     # Tracking de uso
```

### Enums

```prisma
TenantStatus    # TRIAL, ACTIVE, SUSPENDED, BANNED
PlanType        # FREE, STARTER, PRO, ENTERPRISE
UserRole        # OWNER, ADMIN, AGENT
MessageType     # TEXT, IMAGE, DOCUMENT, AUDIO, VIDEO, LOCATION, CONTACT, INTERACTIVE, TEMPLATE
AutoReplyTrigger # KEYWORD, PATTERN, GREETING, THANKS, GOODBYE
```

## Variables de Entorno

```bash
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=xxx
JWT_REFRESH_SECRET=xxx

# WhatsApp
WHATSAPP_VERIFY_TOKEN=xxx

# AI
GROQ_API_KEY=gsk_xxx

# Google
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
```

## Desarrollo Local

```bash
# Backend
cd backend
npm install
cp .env.example .env  # Configurar variables
npx prisma generate
npx prisma db push
npm run dev           # http://localhost:3000

# Frontend
cd frontend
npm install
npm run dev           # http://localhost:5173

# Docker (stack completo)
docker-compose -f docker-compose.dev.yml up
```

## Despliegue

### 1. Configurar Pulumi ESC

```bash
# Crear environment
pulumi env init Aika-labs-org/chati/dev

# Editar secretos
pulumi env edit Aika-labs-org/chati/dev
```

### 2. Desplegar Infraestructura

```bash
cd infra
npm install
pulumi up
```

### 3. Configurar DNS

```
A    chati.example.com     → IP_DEL_SERVIDOR
A    api.chati.example.com → IP_DEL_SERVIDOR
```

### 4. Desplegar Aplicación

```bash
ssh deploy@IP_DEL_SERVIDOR
cd /opt/chati
git clone https://github.com/Aika-labs/chati.git app
cd app
docker-compose up -d
```

## API Endpoints

### Auth
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registro |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/auth/google` | OAuth Google |

### WhatsApp
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/whatsapp/webhook` | Verificación Meta |
| POST | `/api/whatsapp/webhook` | Recibir mensajes |
| POST | `/api/whatsapp/send/text` | Enviar texto |
| POST | `/api/whatsapp/send/template` | Enviar template |
| POST | `/api/whatsapp/send/buttons` | Enviar botones |
| POST | `/api/whatsapp/send/list` | Enviar lista |

### AutoReply
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/autoreply` | Listar reglas |
| GET | `/api/autoreply/:id` | Obtener regla |
| POST | `/api/autoreply` | Crear regla |
| PATCH | `/api/autoreply/:id` | Actualizar regla |
| DELETE | `/api/autoreply/:id` | Eliminar regla |
| POST | `/api/autoreply/test` | Probar matching |
| POST | `/api/autoreply/defaults` | Crear reglas default |

### AI
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/ai/process` | Procesar mensaje |
| POST | `/api/ai/quick` | Respuesta rápida |

### RAG
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/rag/upload` | Subir documento |
| GET | `/api/rag/documents` | Listar documentos |
| POST | `/api/rag/search` | Búsqueda semántica |

### Calendar
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/calendar/slots` | Disponibilidad |
| POST | `/api/calendar/appointments` | Crear cita |
| PATCH | `/api/calendar/appointments/:id` | Actualizar cita |

### Contacts
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/contacts` | Listar contactos |
| GET | `/api/contacts/:id` | Obtener contacto |
| PATCH | `/api/contacts/:id` | Actualizar contacto |
| POST | `/api/contacts/:id/tags` | Agregar tag |

## Límites por Plan

| Feature | FREE | STARTER | PRO | ENTERPRISE |
|---------|------|---------|-----|------------|
| Mensajes/día | 250 | 1,000 | 5,000 | Ilimitado |
| Documentos RAG | 50 | 200 | 1,000 | Ilimitado |
| Contactos | 1,000 | 5,000 | 25,000 | Ilimitado |
| Usuarios | 1 | 3 | 10 | Ilimitado |

## Estructura del Proyecto

```
chati/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Modelos de BD
│   ├── src/
│   │   ├── config/             # Configuración
│   │   ├── modules/            # Módulos de negocio
│   │   │   ├── ai/
│   │   │   ├── auth/
│   │   │   ├── autoreply/
│   │   │   ├── calendar/
│   │   │   ├── contacts/
│   │   │   ├── gatekeeper/
│   │   │   ├── knowledge/
│   │   │   ├── rag/
│   │   │   ├── realtime/
│   │   │   ├── tenant/
│   │   │   └── whatsapp/
│   │   ├── shared/             # Utilidades compartidas
│   │   ├── app.ts              # Entry point API
│   │   └── worker.ts           # Entry point Jobs
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Componentes React
│   │   ├── pages/              # Páginas
│   │   ├── stores/             # Zustand stores
│   │   └── lib/                # Utilidades
│   └── package.json
├── infra/
│   ├── esc/                    # Pulumi ESC environments
│   ├── index.ts                # Pulumi program
│   └── Pulumi.yaml
├── docker-compose.yml          # Producción
├── docker-compose.dev.yml      # Desarrollo
└── README.md
```

## Licencia

MIT
