# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Author CRM - A customer relationship management system for managing author leads, deals, and sales pipelines. Built with React, TypeScript, and Supabase using the Lovable.dev platform.

**Last Updated**: August 2025  
**Version**: Production-ready with real-time collaboration features

## Key Commands

### Development
- `npm run dev` - Start development server on port 8080
- `npm run build` - Create production build
- `npm run lint` - Run ESLint for code quality checks
- `npm run preview` - Preview production build locally

### Database
- Database migrations and schema changes are managed through Supabase dashboard
- Real-time subscriptions are used for live updates across users

## Architecture Overview

### Frontend Stack
- **React 18** with TypeScript for type safety
- **Vite** for fast builds and HMR
- **shadcn/ui** components (Radix UI + Tailwind CSS)
- **React Query** for server state management
- **React Router v6** for client-side routing
- **React Hook Form + Zod** for form validation

### Backend Services
- **Supabase** provides:
  - PostgreSQL database
  - Authentication with role-based access
  - Real-time subscriptions
  - Row-level security policies
  - Edge functions (if needed)

### Project Structure
```
/src
├── components/       # UI components organized by feature
│   ├── ui/          # Reusable shadcn/ui components
│   ├── admin/       # Admin-specific components
│   ├── auth/        # Authentication flows
│   ├── dashboard/   # Dashboard views
│   ├── deals/       # Deal management
│   ├── leads/       # Lead management
│   └── pipeline/    # Visual pipeline board
├── hooks/           # Custom React hooks for business logic
├── integrations/    # Supabase client and queries
├── lib/            # Utility functions and API layer
└── pages/          # Route components
```

### Key Architectural Patterns

1. **Component Composition**: Features are built as compositions of smaller, reusable components
2. **Custom Hooks**: Business logic is extracted into hooks (useLeads, useDeals, etc.)
3. **Type Safety**: All data models have TypeScript interfaces in `integrations/supabase/types.ts`
4. **Protected Routes**: Role-based access control using ProtectedRoute component
5. **Real-time Updates**: Supabase channels for live data synchronization
6. **Optimistic Updates**: React Query mutations with optimistic UI updates

### User Roles
- `leads_manager`: Can manage leads and view pipeline
- `sales_manager`: Full access to leads, deals, and team management
- `sales`: Can manage assigned leads and their deals

### Database Schema Key Tables
- `users`: Extended auth users with roles and profiles
- `leads`: Author information with contact details
- `deals`: Sales opportunities linked to leads
- `lead_activities`: Interaction history (calls, emails, meetings)
- `pipeline_stages`: Customizable deal stages
- `tags` & `statuses`: Flexible categorization system

### Development Guidelines

1. **State Management**: Use React Query for server state, local state for UI-only concerns
2. **Error Handling**: All API calls should handle errors gracefully with user feedback
3. **Real-time Features**: Subscribe to Supabase channels in components that need live updates
4. **Form Validation**: Always use Zod schemas for form validation
5. **Type Safety**: Never use `any` type - define proper interfaces for all data
6. **Component Organization**: Keep components focused and extract shared logic to hooks

### Common Tasks

**Adding a new feature:**
1. Create TypeScript interfaces in `integrations/supabase/types.ts`
2. Add database queries in `integrations/supabase/client.ts`
3. Create a custom hook in `/hooks` for the feature logic
4. Build UI components in relevant `/components` subdirectory
5. Add route in `App.tsx` if needed

**Modifying database schema:**
1. Make changes in Supabase dashboard
2. Update TypeScript types to match
3. Update any affected queries and components

**Working with real-time updates:**
```typescript
// Example pattern for real-time subscriptions
useEffect(() => {
  const channel = supabase
    .channel('table-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'your_table' },
      (payload) => {
        // Handle change
      }
    )
    .subscribe();
    
  return () => { supabase.removeChannel(channel) };
}, []);
```

### Important Notes

- The project uses Lovable.dev platform conventions
- No test files in src/ - testing is likely handled by the platform
- Always check for existing patterns before implementing new features
- Maintain consistency with existing code style and component patterns
- Use the existing UI components from shadcn/ui before creating new ones

## Current State (August 2025)

### Recent Features Completed
- Enhanced bulk action user selection with searchable combobox
- Fixed user dropdown pagination issues
- Added source field tracking for leads
- Improved author search functionality
- Enhanced pipeline metrics and analytics

### Active Components Count
- **48 shadcn/ui base components** providing consistent UI primitives
- **17 custom hooks** managing business logic and real-time subscriptions
- **9 main pages** with protected routing
- **7 API service modules** in lib/api/
- **18 database migrations** ensuring schema evolution

### Performance Considerations
- Real-time subscriptions active for: leads, deals, activities, comments, tags, statuses
- React Query caching implemented for all data fetching
- Optimistic updates enabled for better UX
- Database indexes on all foreign keys and commonly queried fields

### Security Implementation
- Row-level security (RLS) enforced at database level
- Role-based access control (RBAC) with three roles
- Protected routes with role checking
- Session-based authentication via Supabase Auth

### Known Integration Points
- CSV import/export for lead management
- Drag-and-drop pipeline board using @dnd-kit
- Real-time notifications via Sonner
- Data visualization with Recharts
- File handling with react-dropzone

### Deployment Configuration
- Vercel deployment ready (vercel.json present)
- Environment variables managed via Vite
- Production builds optimized with tree-shaking
- Static assets served from /public