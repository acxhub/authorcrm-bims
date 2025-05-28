# Author CRM - Full Project Scope

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technical Stack](#technical-stack)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Database Structure](#database-structure)
5. [API Specifications](#api-specifications)
6. [Process Flows](#process-flows)
7. [UI Components & Pages](#ui-components--pages)
8. [Development Phases](#development-phases)
9. [File Structure](#file-structure)
10. [Implementation Guidelines](#implementation-guidelines)
11. [Testing Strategy](#testing-strategy)
12. [Deployment & DevOps](#deployment--devops)

---

## Project Overview

### Mission Statement
Build a comprehensive web-based CRM system specifically designed for managing author and book leads, featuring role-based access control, pipeline management, and collaborative tools.

### Core Features
- **Lead Management**: Import, organize, and track author/book prospects
- **Pipeline Visualization**: Kanban-style board for visual sales tracking
- **Role-Based Access**: Three distinct user roles with appropriate permissions
- **Activity Tracking**: Comprehensive logging and commenting system
- **Assignment Management**: Flexible lead assignment and notification system

### Success Metrics
- Support for 1000+ concurrent leads
- Sub-2 second page load times
- 99.9% uptime
- Intuitive user experience across all role types

---

## Technical Stack

### Frontend
- **Build Tool**: Vite (v5.x)
- **Language**: TypeScript (v5.x)
- **Framework**: React (v18.x)
- **UI Library**: shadcn/ui
- **Styling**: Tailwind CSS (v3.x)
- **State Management**: Zustand
- **Routing**: React Router (v6.x)
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: TanStack Query + Axios

### Backend
- **Runtime**: Node.js (v20.x)
- **Framework**: Express.js
- **Database**: PostgreSQL (v15.x)
- **ORM**: Prisma
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer + AWS S3
- **Validation**: Zod
- **API Documentation**: Swagger/OpenAPI

### DevOps & Deployment
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Hosting**: AWS (Frontend: S3+CloudFront, Backend: ECS)
- **Database Hosting**: AWS RDS
- **Monitoring**: CloudWatch + Sentry

---

## User Roles & Permissions

### [Role Matrix](#role-permissions-table)

| Feature | Leads Manager | Sales Manager | Sales |
|---------|---------------|---------------|-------|
| View All Leads | ✅ | ✅ | ❌ |
| View Assigned Leads | ✅ | ✅ | ✅ |
| Add New Leads | ✅ | ✅ | ✅ |
| Edit Any Lead | ✅ | ✅ | ❌ |
| Edit Assigned Leads | ✅ | ✅ | ✅ |
| Import/Export Leads | ✅ | ✅ | ✅ |
| User Management | ✅ | ❌ | ❌ |
| System Configuration | ✅ | ❌ | ❌ |
| Lead Assignment | ✅ | ✅ | ❌ |
| Pipeline Board Access | ✅ | ✅ | ✅ (filtered) |
| Activity Logging | ✅ | ✅ | ✅ |
| Comments | ✅ | ✅ | ✅ |

### Role Definitions

#### Leads Manager
- **Primary Role**: System administrator and lead curator
- **Key Responsibilities**: 
  - Import and validate new leads
  - Configure system settings
  - Manage user accounts
  - Oversee data quality

#### Sales Manager  
- **Primary Role**: Team leader and sales overseer
- **Key Responsibilities**:
  - Assign leads to sales team
  - Monitor team performance
  - Review pipeline metrics
  - Mentor sales staff

#### Sales
- **Primary Role**: Lead conversion specialist
- **Key Responsibilities**:
  - Contact assigned leads
  - Add new leads they discover
  - Log interaction activities
  - Move leads through pipeline
  - Close deals

---

## Database Structure

### [Entity Relationship Diagram](#erd-reference)

```mermaid
erDiagram
    User ||--o{ Lead : assigns
    User ||--o{ ActivityLog : creates
    User ||--o{ Comment : authors
    Lead ||--o{ ActivityLog : has
    Lead ||--o{ Comment : receives
    Lead }o--|| Status : has
    Lead }o--o{ Tag : tagged_with
    
    User {
        uuid id PK
        string email UK
        string password_hash
        string first_name
        string last_name
        enum role
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    Lead {
        uuid id PK
        string book_title
        string amazon_link
        string phone_number_1
        string phone_number_2
        string primary_email
        string secondary_email
        string author_name
        text author_bio
        boolean multiple_titles
        json other_titles
        uuid assigned_to FK
        uuid created_by FK
        uuid status_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    Status {
        uuid id PK
        string name
        string color
        int order_index
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    Tag {
        uuid id PK
        string name
        string color
        string description
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    LeadTag {
        uuid lead_id FK
        uuid tag_id FK
        timestamp created_at
    }
    
    ActivityLog {
        uuid id PK
        uuid lead_id FK
        uuid user_id FK
        enum activity_type
        timestamp activity_date
        text summary
        text outcome
        timestamp created_at
        timestamp updated_at
    }
    
    Comment {
        uuid id PK
        uuid lead_id FK
        uuid user_id FK
        uuid parent_comment_id FK
        text content
        timestamp created_at
        timestamp updated_at
    }
```

### [Database Schema Definitions](#schema-tables)

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'sales',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE user_role AS ENUM ('leads_manager', 'sales_manager', 'sales');
```

#### Leads Table
```sql
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_title VARCHAR(255) NOT NULL,
    amazon_link VARCHAR(500),
    phone_number_1 VARCHAR(20),
    phone_number_2 VARCHAR(20),
    primary_email VARCHAR(255),
    secondary_email VARCHAR(255),
    author_name VARCHAR(255) NOT NULL,
    author_bio TEXT,
    multiple_titles BOOLEAN DEFAULT false,
    other_titles JSONB,
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id) NOT NULL,
    status_id UUID REFERENCES statuses(id) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### [Additional Tables](#supporting-tables)
- [Statuses Table](#statuses-table)
- [Tags Table](#tags-table)
- [Lead Tags Junction Table](#lead-tags-table)
- [Activity Log Table](#activity-log-table)
- [Comments Table](#comments-table)

---

## API Specifications

### [Authentication Endpoints](#auth-api)

```typescript
// Authentication Types
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
}
```

**POST** `/api/auth/login`
- **Body**: `LoginRequest`
- **Response**: `LoginResponse`
- **Status**: 200 | 401

**POST** `/api/auth/refresh`
- **Headers**: `Authorization: Bearer {refreshToken}`
- **Response**: `{ token: string }`
- **Status**: 200 | 401

### [Leads API Endpoints](#leads-api)

**GET** `/api/leads`
- **Query Params**: 
  ```typescript
  interface LeadsQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: string[];
    tags?: string[];
    assignedTo?: string;
    createdBy?: string;
    dateFrom?: string;
    dateTo?: string;
  }
  ```
- **Response**: `PaginatedResponse<Lead[]>`
- **Permissions**: All roles (filtered by role)

**GET** `/api/leads/:id`
- **Response**: `Lead`
- **Permissions**: Owner or Manager roles

**POST** `/api/leads`
- **Body**: `CreateLeadRequest`
- **Response**: `Lead`
- **Permissions**: Manager roles only

**PUT** `/api/leads/:id`
- **Body**: `UpdateLeadRequest`
- **Response**: `Lead`
- **Permissions**: Owner or Manager roles

**DELETE** `/api/leads/:id`
- **Response**: `{ success: boolean }`
- **Permissions**: Leads Manager only

### [Pipeline API Endpoints](#pipeline-api)

**GET** `/api/pipeline/board`
- **Response**: `PipelineBoard`
- **Permissions**: All roles (filtered view)

**PUT** `/api/pipeline/move`
- **Body**: `{ leadId: string, fromStatus: string, toStatus: string, note?: string }`
- **Response**: `{ success: boolean }`
- **Permissions**: Assigned user or Manager roles

### [Activity & Comments API](#activity-api)

**GET** `/api/leads/:id/activities`
- **Response**: `ActivityLog[]`
- **Permissions**: Lead viewer permissions

**POST** `/api/leads/:id/activities`
- **Body**: `CreateActivityRequest`
- **Response**: `ActivityLog`
- **Permissions**: Lead editor permissions

**GET** `/api/leads/:id/comments`
- **Response**: `Comment[]`
- **Permissions**: Lead viewer permissions

**POST** `/api/leads/:id/comments`
- **Body**: `CreateCommentRequest`
- **Response**: `Comment`
- **Permissions**: Lead viewer permissions

---

## Process Flows

### [Lead Lifecycle Flow](#lead-lifecycle)

```mermaid
flowchart TD
    A[Import/Create Lead] --> B{Data Validation}
    B -->|Valid| C[Auto-assign or Manual Assignment]
    B -->|Invalid| D[Validation Errors]
    D --> A
    
    C --> E[Notification Sent]
    E --> F[Sales Contact Attempt]
    F --> G{Contact Successful?}
    
    G -->|Yes| H[Log Activity]
    G -->|No| I[Tag as Dead/Wrong Number]
    
    H --> J[Move to 'Contacted']
    J --> K[Follow-up Activities]
    K --> L{Sales Progress?}
    
    L -->|Progressing| M[Move Through Pipeline]
    L -->|Stalled| N[Add Follow-up Notes]
    L -->|Not Interested| O[Mark as Dead Lead]
    
    M --> P{Deal Closed?}
    P -->|Won| Q[Mark as Sold Lead]
    P -->|Lost| R[Mark as Dead Lead]
    P -->|Ongoing| K
    
    I --> S[End Process]
    O --> S
    Q --> S
    R --> S
```

### [User Authentication Flow](#auth-flow)

```mermaid
flowchart TD
    A[User Login] --> B[Validate Credentials]
    B -->|Valid| C[Generate JWT Token]
    B -->|Invalid| D[Return Error]
    
    C --> E[Set Session]
    E --> F[Redirect to Dashboard]
    
    F --> G[API Request]
    G --> H[Verify JWT]
    H -->|Valid| I[Check Permissions]
    H -->|Invalid| J[Return 401]
    
    I -->|Authorized| K[Process Request]
    I -->|Forbidden| L[Return 403]
```

### [Lead Assignment Flow](#assignment-flow)

```mermaid
flowchart TD
    A[New Lead Created] --> B{Auto-assign Enabled?}
    B -->|Yes| C[Apply Assignment Rules]
    B -->|No| D[Assign to Leads Manager]
    
    C --> E{Round Robin?}
    E -->|Yes| F[Find Next Sales Rep]
    E -->|No| G[Load Balance Check]
    
    F --> H[Assign Lead]
    G --> I[Find Rep with Lowest Count]
    I --> H
    D --> H
    
    H --> J[Send Notification]
    J --> K[Update Lead Status]
    K --> L[Log Assignment Activity]
```

---

## UI Components & Pages

### [Component Architecture](#component-structure)

```
src/
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Layout.tsx
│   │   └── Navigation.tsx
│   ├── leads/
│   │   ├── LeadCard.tsx
│   │   ├── LeadForm.tsx
│   │   ├── LeadList.tsx
│   │   ├── LeadDetails.tsx
│   │   └── LeadImporter.tsx
│   ├── pipeline/
│   │   ├── KanbanBoard.tsx
│   │   ├── PipelineColumn.tsx
│   │   ├── LeadCard.tsx
│   │   └── MoveLeadModal.tsx
│   ├── activities/
│   │   ├── ActivityLog.tsx
│   │   ├── ActivityForm.tsx
│   │   └── ActivityItem.tsx
│   ├── comments/
│   │   ├── CommentThread.tsx
│   │   ├── CommentForm.tsx
│   │   └── CommentItem.tsx
│   └── shared/
│       ├── DataTable.tsx
│       ├── SearchBar.tsx
│       ├── FilterPanel.tsx
│       └── TagSelector.tsx
```

### [Page Components](#page-components)

#### Dashboard Page
```typescript
// src/pages/Dashboard.tsx
interface DashboardProps {
  userRole: UserRole;
}

const Dashboard: React.FC<DashboardProps> = ({ userRole }) => {
  // Role-based dashboard content
  // - Pipeline metrics
  // - Recent activities
  // - Assigned leads summary
  // - Quick actions
}
```

#### Leads Management Page
```typescript
// src/pages/LeadsManagement.tsx
const LeadsManagement: React.FC = () => {
  // - Lead list with advanced filtering
  // - Bulk operations
  // - Import/Export functionality
  // - Quick edit capabilities
}
```

#### Pipeline Board Page
```typescript
// src/pages/PipelineBoard.tsx
const PipelineBoard: React.FC = () => {
  // - Kanban-style board
  // - Drag-and-drop functionality
  // - Stage metrics
  // - Lead details preview
}
```

### [Component Props & Interfaces](#component-interfaces)

```typescript
// Lead-related interfaces
interface Lead {
  id: string;
  bookTitle: string;
  amazonLink?: string;
  phoneNumber1?: string;
  phoneNumber2?: string;
  primaryEmail?: string;
  secondaryEmail?: string;
  authorName: string;
  authorBio?: string;
  multipleTitles: boolean;
  otherTitles?: string[];
  assignedTo?: User;
  createdBy: User;
  status: Status;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

interface Status {
  id: string;
  name: string;
  color: string;
  orderIndex: number;
  isActive: boolean;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  isActive: boolean;
}

interface ActivityLog {
  id: string;
  leadId: string;
  userId: string;
  user: User;
  activityType: ActivityType;
  activityDate: string;
  summary: string;
  outcome?: string;
  createdAt: string;
}

type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'status_change' | 'assignment';
```

---

## Development Phases

### [Sprint 1: Foundation & Authentication](#sprint-1) (2 weeks)

**Goals**: Establish project foundation, authentication, and role-based access

**Deliverables**:
- [ ] Project setup with Vite + TypeScript
- [ ] Database schema implementation
- [ ] User authentication system
- [ ] Role-based route protection
- [ ] Basic layout components

**Technical Tasks**:
```bash
# Setup tasks
npm create vite@latest author-crm -- --template react-ts
npm install @shadcn/ui tailwindcss react-router-dom zustand
npx shadcn-ui@latest init

# Database setup
npm install prisma @prisma/client
npx prisma init
npx prisma generate
npx prisma db push
```

**Key Files to Create**:
- `src/lib/auth.ts` - Authentication utilities
- `src/stores/authStore.ts` - Auth state management
- `src/components/ProtectedRoute.tsx` - Route protection
- `prisma/schema.prisma` - Database schema

### [Sprint 2: Lead Management Core](#sprint-2) (2 weeks)

**Goals**: Implement core lead CRUD operations

**Deliverables**:
- [ ] Lead creation and editing forms
- [ ] Lead list with filtering/search
- [ ] Lead detail view
- [ ] Basic validation and error handling

**Key Components**:
- `LeadForm.tsx` - Create/edit lead form
- `LeadList.tsx` - Paginated lead listing
- `LeadDetails.tsx` - Detailed lead view
- `SearchBar.tsx` - Global search functionality

### [Sprint 3: Import System & Activity Logging](#sprint-3) (2 weeks)

**Goals**: Enable bulk lead import and activity tracking

**Deliverables**:
- [ ] CSV/XLSX import functionality
- [ ] Data validation and duplicate detection
- [ ] Activity logging system
- [ ] Basic commenting system

**Key Features**:
- File upload with progress indication
- Column mapping interface
- Validation error reporting
- Activity timeline view

### [Sprint 4: Tagging & Status Management](#sprint-4) (2 weeks)

**Goals**: Implement tagging system and status management

**Deliverables**:
- [ ] Tag creation and management
- [ ] Status configuration interface
- [ ] Lead tagging functionality
- [ ] Bulk tag operations

**Admin Features**:
- Tag color customization
- Status workflow configuration
- Bulk update capabilities

### [Sprint 5: Pipeline Board & Drag-Drop](#sprint-5) (3 weeks)

**Goals**: Create visual pipeline with drag-and-drop functionality

**Deliverables**:
- [ ] Kanban board interface
- [ ] Drag-and-drop lead movement
- [ ] Pipeline stage metrics
- [ ] Lead progression tracking

**Technical Implementation**:
```typescript
// Example drag-and-drop implementation
import { DndProvider, useDrag, useDrop } from 'react-dnd';

const LeadCard: React.FC<{ lead: Lead }> = ({ lead }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'lead',
    item: { id: lead.id, currentStatus: lead.status.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  return (
    <div ref={drag} className={isDragging ? 'opacity-50' : ''}>
      {/* Lead card content */}
    </div>
  );
};
```

### [Sprint 6: Notifications & Dashboard](#sprint-6) (2 weeks)

**Goals**: Add notification system and comprehensive dashboard

**Deliverables**:
- [ ] Email notification system
- [ ] In-app notification center
- [ ] Role-based dashboard views
- [ ] Pipeline analytics

**Dashboard Metrics**:
- Conversion rates by stage
- Lead distribution by assignee
- Activity summaries
- Performance trends

### [Sprint 7: Testing & Optimization](#sprint-7) (2 weeks)

**Goals**: Comprehensive testing and performance optimization

**Deliverables**:
- [ ] Unit test coverage >80%
- [ ] Integration test suite
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation completion

**Testing Strategy**:
```typescript
// Example test structure
describe('LeadManagement', () => {
  describe('Lead Creation', () => {
    it('should create a lead with valid data', async () => {
      // Test implementation
    });
    
    it('should validate required fields', async () => {
      // Test implementation
    });
  });
});
```

---

## File Structure

### [Complete Project Structure](#project-structure)

```
author-crm/
├── public/
│   ├── favicon.ico
│   └── index.html
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Layout.tsx
│   │   │   └── Navigation.tsx
│   │   ├── leads/
│   │   │   ├── LeadCard.tsx
│   │   │   ├── LeadForm.tsx
│   │   │   ├── LeadList.tsx
│   │   │   ├── LeadDetails.tsx
│   │   │   ├── LeadImporter.tsx
│   │   │   └── LeadSearch.tsx
│   │   ├── pipeline/
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── PipelineColumn.tsx
│   │   │   ├── LeadCard.tsx
│   │   │   ├── MoveLeadModal.tsx
│   │   │   └── PipelineMetrics.tsx
│   │   ├── activities/
│   │   │   ├── ActivityLog.tsx
│   │   │   ├── ActivityForm.tsx
│   │   │   ├── ActivityItem.tsx
│   │   │   └── ActivityFilter.tsx
│   │   ├── comments/
│   │   │   ├── CommentThread.tsx
│   │   │   ├── CommentForm.tsx
│   │   │   ├── CommentItem.tsx
│   │   │   └── CommentReply.tsx
│   │   ├── admin/
│   │   │   ├── UserManagement.tsx
│   │   │   ├── TagManagement.tsx
│   │   │   ├── StatusManagement.tsx
│   │   │   └── SystemSettings.tsx
│   │   └── shared/
│   │       ├── DataTable.tsx
│   │       ├── SearchBar.tsx
│   │       ├── FilterPanel.tsx
│   │       ├── TagSelector.tsx
│   │       ├── DatePicker.tsx
│   │       └── LoadingSpinner.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── LeadsManagement.tsx
│   │   ├── PipelineBoard.tsx
│   │   ├── LeadDetails.tsx
│   │   ├── UserProfile.tsx
│   │   ├── AdminPanel.tsx
│   │   └── Login.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useLeads.ts
│   │   ├── usePipeline.ts
│   │   ├── useActivities.ts
│   │   ├── useComments.ts
│   │   └── useLocalStorage.ts
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── leadsStore.ts
│   │   ├── pipelineStore.ts
│   │   ├── notificationStore.ts
│   │   └── configStore.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── utils.ts
│   │   ├── validations.ts
│   │   ├── constants.ts
│   │   └── types.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── components.css
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── leadsController.ts
│   │   │   ├── pipelineController.ts
│   │   │   ├── activitiesController.ts
│   │   │   ├── commentsController.ts
│   │   │   └── adminController.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── validation.ts
│   │   │   ├── permissions.ts
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── leads.ts
│   │   │   ├── pipeline.ts
│   │   │   ├── activities.ts
│   │   │   ├── comments.ts
│   │   │   └── admin.ts
│   │   ├── services/
│   │   │   ├── authService.ts
│   │   │   ├── leadsService.ts
│   │   │   ├── emailService.ts
│   │   │   ├── fileService.ts
│   │   │   └── notificationService.ts
│   │   ├── utils/
│   │   │   ├── database.ts
│   │   │   ├── logger.ts
│   │   │   ├── validation.ts
│   │   │   └── helpers.ts
│   │   ├── types/
│   │   │   ├── auth.ts
│   │   │   ├── leads.ts
│   │   │   ├── pipeline.ts
│   │   │   └── common.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── fixtures/
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   ├── api/
│   │   ├── authentication.md
│   │   ├── leads.md
│   │   ├── pipeline.md
│   │   └── activities.md
│   ├── deployment/
│   │   ├── aws-setup.md
│   │   ├── docker.md
│   │   └── environment.md
│   └── user-guides/
│       ├── leads-manager.md
│       ├── sales-manager.md
│       └── sales.md
├── docker-compose.yml
├── Dockerfile
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

---

## Implementation Guidelines

### [Code Standards](#code-standards)

#### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/pages/*": ["./src/pages/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/stores/*": ["./src/stores/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### ESLint & Prettier Configuration
```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "react", "react-hooks"],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### [State Management Patterns](#state-management)

#### Zustand Store Example
```typescript
// src/stores/leadsStore.ts
import { create } from 'zustand';
import { Lead, LeadsFilter } from '@/lib/types';

interface LeadsState {
  leads: Lead[];
  selectedLead: Lead | null;
  filters: LeadsFilter;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setLeads: (leads: Lead[]) => void;
  addLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  setSelectedLead: (lead: Lead | null) => void;
  setFilters: (filters: Partial<LeadsFilter>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useLeadsStore = create<LeadsState>((set, get) => ({
  leads: [],
  selectedLead: null,
  filters: {},
  isLoading: false,
  error: null,
  
  setLeads: (leads) => set({ leads }),
  addLead: (lead) => set((state) => ({ leads: [...state.leads, lead] })),
  updateLead: (id, updates) => set((state) => ({
    leads: state.leads.map(lead => 
      lead.id === id ? { ...lead, ...updates } : lead
    )
  })),
  deleteLead: (id) => set((state) => ({
    leads: state.leads.filter(lead => lead.id !== id)
  })),
  setSelectedLead: (selectedLead) => set({ selectedLead }),
  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters } 
  })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
```

#### Custom Hooks Pattern
```typescript
// src/hooks/useLeads.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLeadsStore } from '@/stores/leadsStore';
import { leadsApi } from '@/lib/api';

export const useLeads = () => {
  const queryClient = useQueryClient();
  const { filters, setLoading, setError } = useLeadsStore();
  
  const {
    data: leads,
    isLoading,
    error
  } = useQuery({
    queryKey: ['leads', filters],
    queryFn: () => leadsApi.getAll(filters),
    onSuccess: () => setError(null),
    onError: (error) => setError(error.message),
  });
  
  const createLeadMutation = useMutation({
    mutationFn: leadsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
    },
  });
  
  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) => 
      leadsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
    },
  });
  
  return {
    leads,
    isLoading,
    error,
    createLead: createLeadMutation.mutate,
    updateLead: updateLeadMutation.mutate,
    isCreating: createLeadMutation.isLoading,
    isUpdating: updateLeadMutation.isLoading,
  };
};
```

### [Component Patterns](#component-patterns)

#### Form Component with Validation
```typescript
// src/components/leads/LeadForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const leadSchema = z.object({
  bookTitle: z.string().min(1, 'Book title is required'),
  authorName: z.string().min(1, 'Author name is required'),
  primaryEmail: z.string().email('Invalid email format').optional(),
  phoneNumber1: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone format').optional(),
  amazonLink: z.string().url('Invalid URL format').optional(),
  multipleTitles: z.boolean(),
  otherTitles: z.array(z.string()).optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadFormProps {
  lead?: Lead;
  onSubmit: (data: LeadFormData) => void;
  isLoading?: boolean;
}

export const LeadForm: React.FC<LeadFormProps> = ({ 
  lead, 
  onSubmit, 
  isLoading = false 
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: lead || {
      multipleTitles: false,
      otherTitles: [],
    },
  });
  
  const multipleTitles = watch('multipleTitles');
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Book Title *
          </label>
          <input
            {...register('bookTitle')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="Enter book title"
          />
          {errors.bookTitle && (
            <p className="mt-1 text-sm text-red-600">{errors.bookTitle.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Author Name *
          </label>
          <input
            {...register('authorName')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="Enter author name"
          />
          {errors.authorName && (
            <p className="mt-1 text-sm text-red-600">{errors.authorName.message}</p>
          )}
        </div>
      </div>
      
      {/* Additional form fields... */}
      
      <div className="flex items-center">
        <input
          {...register('multipleTitles')}
          type="checkbox"
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-900">
          Author has multiple titles?
        </label>
      </div>
      
      {multipleTitles && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Other Titles
          </label>
          {/* Dynamic array input for other titles */}
        </div>
      )}
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : lead ? 'Update Lead' : 'Create Lead'}
        </button>
      </div>
    </form>
  );
};
```

### [API Integration Patterns](#api-patterns)

#### API Client Configuration
```typescript
// src/lib/api.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor for auth token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

// API service classes
export class LeadsAPI {
  async getAll(filters?: LeadsFilter): Promise<PaginatedResponse<Lead[]>> {
    const { data } = await apiClient.get('/leads', { params: filters });
    return data;
  }
  
  async getById(id: string): Promise<Lead> {
    const { data } = await apiClient.get(`/leads/${id}`);
    return data;
  }
  
  async create(leadData: CreateLeadRequest): Promise<Lead> {
    const { data } = await apiClient.post('/leads', leadData);
    return data;
  }
  
  async update(id: string, updates: UpdateLeadRequest): Promise<Lead> {
    const { data } = await apiClient.put(`/leads/${id}`, updates);
    return data;
  }
  
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/leads/${id}`);
  }
  
  async import(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post('/leads/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }
}

export const leadsApi = new LeadsAPI();
```

---

## Testing Strategy

### [Unit Testing Setup](#unit-testing)

#### Vitest Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### Test Setup File
```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

#### Example Component Test
```typescript
// src/components/leads/__tests__/LeadForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { LeadForm } from '../LeadForm';

describe('LeadForm', () => {
  const mockOnSubmit = vi.fn();
  
  beforeEach(() => {
    mockOnSubmit.mockClear();
  });
  
  it('should render all required fields', () => {
    render(<LeadForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/book title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/author name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create lead/i })).toBeInTheDocument();
  });
  
  it('should validate required fields', async () => {
    render(<LeadForm onSubmit={mockOnSubmit} />);
    
    const submitButton = screen.getByRole('button', { name: /create lead/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/book title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/author name is required/i)).toBeInTheDocument();
    });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
  
  it('should submit valid form data', async () => {
    render(<LeadForm onSubmit={mockOnSubmit} />);
    
    const bookTitleInput = screen.getByLabelText(/book title/i);
    const authorNameInput = screen.getByLabelText(/author name/i);
    const submitButton = screen.getByRole('button', { name: /create lead/i });
    
    fireEvent.change(bookTitleInput, { target: { value: 'Test Book' } });
    fireEvent.change(authorNameInput, { target: { value: 'Test Author' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        bookTitle: 'Test Book',
        authorName: 'Test Author',
        multipleTitles: false,
        otherTitles: [],
      });
    });
  });
});
```

### [Integration Testing](#integration-testing)

#### API Mock Server Setup
```typescript
// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/leads', (req, res, ctx) => {
    return res(
      ctx.json({
        data: [
          {
            id: '1',
            bookTitle: 'Test Book',
            authorName: 'Test Author',
            status: { id: '1', name: 'New Lead' },
            tags: [],
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      })
    );
  }),
  
  rest.post('/api/leads', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: '2',
        ...req.body,
        createdAt: new Date().toISOString(),
      })
    );
  }),
];

export const server = setupServer(...handlers);
```

### [E2E Testing with Playwright](#e2e-testing)

```typescript
// tests/e2e/lead-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Lead Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as leads manager
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'leads.manager@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });
  
  test('should create a new lead', async ({ page }) => {
    await page.goto('/leads');
    await page.click('[data-testid="create-lead-button"]');
    
    await page.fill('[data-testid="book-title"]', 'New Test Book');
    await page.fill('[data-testid="author-name"]', 'New Test Author');
    await page.fill('[data-testid="primary-email"]', 'author@example.com');
    
    await page.click('[data-testid="submit-button"]');
    
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('text=New Test Book')).toBeVisible();
  });
  
  test('should move lead through pipeline', async ({ page }) => {
    await page.goto('/pipeline');
    
    const leadCard = page.locator('[data-testid="lead-card-1"]');
    const contactedColumn = page.locator('[data-testid="pipeline-column-contacted"]');
    
    await leadCard.dragTo(contactedColumn);
    
    await expect(page.locator('[data-testid="move-lead-modal"]')).toBeVisible();
    await page.fill('[data-testid="outcome-note"]', 'Successfully contacted author');
    await page.click('[data-testid="confirm-move"]');
    
    await expect(contactedColumn.locator('[data-testid="lead-card-1"]')).toBeVisible();
  });
});
```

---

## Deployment & DevOps

### [Docker Configuration](#docker-setup)

#### Frontend Dockerfile
```dockerfile
# Dockerfile.frontend
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Backend Dockerfile
```dockerfile
# Dockerfile.backend
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:80"
    environment:
      - VITE_API_BASE_URL=http://localhost:3001/api
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/author_crm
      - JWT_SECRET=your-secret-key
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=author_crm
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### [CI/CD Pipeline](#cicd-pipeline)

#### GitHub Actions Workflow
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci
          cd backend && npm ci
      
      - name: Run frontend tests
        run: npm run test:ci
      
      - name: Run backend tests
        run: cd backend && npm run test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Build frontend
        run: npm run build
      
      - name: Build backend
        run: cd backend && npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to ECS
        run: |
          # ECS deployment script
          aws ecs update-service --cluster author-crm --service backend --force-new-deployment
```

---

## Summary & Next Steps

This comprehensive project scope provides a complete roadmap for developing the Author CRM system. The document includes:

✅ **Complete technical specifications** with modern stack
✅ **Detailed database design** with proper relationships  
✅ **Role-based permission system** for three user types
✅ **API specifications** with TypeScript interfaces
✅ **Process flows** for all major user journeys
✅ **Component architecture** using React + shadcn/ui
✅ **Development phases** broken into manageable sprints
✅ **Testing strategy** covering unit, integration, and E2E
✅ **Deployment configuration** with Docker and CI/CD

### Immediate Next Steps:

1. **Initialize the project** using the provided file structure
2. **Set up the database** with the Prisma schema
3. **Implement authentication** and role-based access control
4. **Begin with Sprint 1** following the phased approach
5. **Set up testing infrastructure** from day one
6. **Configure deployment pipeline** early in development

### Key Success Factors:

- **Follow the sprint breakdown** to maintain steady progress
- **Implement comprehensive testing** at each phase
- **Use TypeScript strictly** for type safety
- **Maintain consistent code standards** with ESLint/Prettier
- **Document API changes** as development progresses
- **Regular user feedback** during each sprint review

The project is designed to be scalable, maintainable, and user-focused, with clear separation of concerns and modern development practices throughout.