Chati - WhatsApp AI Automation SaaS Platform
Complete multi-tenant SaaS platform for WhatsApp AI automation with RAG, CRM, calendar, and knowledge base features.

Backend (Node.js + Express + TypeScript)
Architecture
Multi-tenant: Complete tenant isolation with row-level security
11 Modules: Auth, Tenant, WhatsApp, Gatekeeper, AI, RAG, Knowledge, Calendar, Contacts, Realtime, Jobs
Database: Prisma ORM with PostgreSQL + pgvector for RAG embeddings
Queue: BullMQ for background job processing
Real-time: Socket.io for live updates
Key Features
WhatsApp Business API integration via webhook
AI responses with Groq (LLaMA 3.3 70B)
RAG system with document embeddings
Rate limiting (250 messages/day per tenant)
Appointment scheduling with Google Calendar sync
Contact management with scoring and tags
Frontend (React + Vite + TailwindCSS)
Pages Implemented
Landing Page: Hero, Features, Pricing, Testimonials, FAQ, CTA, Footer
Auth: Login, Register with form validation (Zod + React Hook Form)
Dashboard: Stats, usage metrics, recent activity
Conversations: WhatsApp Web-style chat interface with AI badges
Contacts/CRM: Data table with filters, tags, pagination, detail sidebar
Calendar: Monthly view with appointment management
Tech Stack
React 18 + TypeScript
Vite for fast builds
TailwindCSS for styling
Zustand for state management
React Query for server state
React Router for navigation
Socket.io client for real-time
Infrastructure (Pulumi + Hetzner)
Hetzner VPS CPX31 (4 vCPU, 8GB RAM)
Docker Compose with Traefik for SSL
ESC environments for secrets management
GitHub Actions CI/CD pipelines
Getting Started
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev

# Docker (full stack)
docker-compose -f docker-compose.dev.yml up
Next Steps
 Configure domain and SSL certificates
 Set up Supabase database
 Configure WhatsApp Business API
 Deploy to Hetzner with pulumi up
