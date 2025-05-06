# Architecture Documentation

## 1. Overview

Squire is a real estate lead routing system designed to automate the assignment of incoming leads to appropriate agents based on configurable routing rules. The system processes incoming leads from various sources (primarily via email), extracts structured data from unstructured content using AI, and routes them to the most suitable agent group based on defined criteria such as property price, location (zip codes), and other attributes.

The application follows a modern full-stack architecture with a clear separation between client and server components. It's built as a single repo containing both frontend and backend code, which can be developed and deployed together.

## 2. System Architecture

Squire follows a client-server architecture with the following high-level components:

### 2.1 Frontend

- **Technology**: React, TypeScript, TailwindCSS, Shadcn UI components
- **State Management**: React Query for server state, context for global app state
- **Routing**: Wouter for lightweight client-side routing

### 2.2 Backend

- **Technology**: Node.js, Express, TypeScript
- **API**: RESTful API endpoints for all client-server communication
- **Authentication**: Session-based authentication stored in PostgreSQL
- **Email Processing**: Integration with email services to receive and process lead data

### 2.3 Database

- **Technology**: PostgreSQL (via Neon Database serverless)
- **ORM**: Drizzle ORM with schema definitions
- **Migration**: Drizzle Kit for schema migrations

### 2.4 AI Integration

- **Service**: Anthropic Claude API for parsing unstructured email data
- **Purpose**: Extract structured lead information from various email formats

## 3. Key Components

### 3.1 Lead Processing Pipeline

1. **Email Receiver**
   - Handles incoming emails containing lead information
   - Supports various sources (Zillow, Zumper, etc.)
   - Extracts raw email content 

2. **AI Parser**
   - Uses Anthropic's Claude to extract structured data from unstructured emails
   - Learns and stores parsing patterns for different lead sources
   - Falls back to existing patterns when possible to minimize API costs

3. **Lead Router**
   - Matches lead attributes against configured routing rules
   - Finds appropriate lead groups with matching agents
   - Selects the optimal agent based on rotation policy and load balancing
   - Records the assignment and lead history

4. **Notification System**
   - Notifies assigned agents of new leads via email through SendGrid
   - Provides relevant lead information to agents

### 3.2 Lead Group Management

- **Lead Groups**: Combine agents and routing rules
- **Routing Criteria**: Price ranges, zip codes, address patterns
- **Agent Rotation**: Fair distribution of leads within a group
- **Priority System**: Allows certain groups to have higher priority for leads

### 3.3 User Management

- **Roles**: Manager and Agent roles with different permissions
- **Authentication**: Username/password with bcrypt hashing
- **Profile Management**: User details, preferences, and performance tracking

### 3.4 Admin Dashboard

- **Lead Monitoring**: View and manage all leads in the system
- **Performance Analytics**: Track lead distribution and agent performance
- **Configuration**: Manage email settings, parsing patterns, and system parameters

## 4. Data Flow

### 4.1 Lead Ingestion Flow

1. Real estate portals send lead emails to the configured forwarding address
2. Email service processes incoming emails and extracts content
3. AI parser converts unstructured email data to structured lead information
4. System inserts lead into database with initial status of "pending"
5. Lead router finds the appropriate agent group based on routing rules
6. System assigns lead to specific agent within the group
7. Notification is sent to the assigned agent
8. Lead status is updated to "assigned"

### 4.2 Lead Management Flow

1. Agent receives lead notification and accesses the system
2. Agent views assigned leads and updates status as they work with the lead
3. Status changes are recorded in lead status history
4. Managers can view overall lead status and agent performance
5. Analytics are generated based on lead conversion rates and agent performance

## 5. External Dependencies

### 5.1 Core Dependencies

- **@neondatabase/serverless**: PostgreSQL database provider
- **drizzle-orm**: Database ORM
- **@anthropic-ai/sdk**: AI text processing
- **@sendgrid/mail**: Email sending service
- **express**: Web server framework
- **react**: Frontend UI library
- **tailwindcss**: Utility-first CSS framework
- **@radix-ui**: UI primitives for accessible components

### 5.2 Development Dependencies

- **TypeScript**: Static typing
- **Vite**: Frontend build tool
- **esbuild**: JavaScript bundler
- **tsx**: TypeScript execution environment

## 6. Schema Design

### 6.1 Core Entities

- **Users**: Stores manager and agent information
- **Leads**: Contains lead details including contact info, property details, and status
- **Lead Groups**: Defines groups of agents with specific routing rules
- **Lead Group Members**: Maps agents to lead groups
- **Lead Status History**: Tracks changes to lead status over time
- **Parsing Patterns**: Stores learned patterns for parsing emails from different sources
- **System Settings**: Configurable system parameters

### 6.2 Key Relationships

- Each lead can be assigned to one agent
- Agents can belong to multiple lead groups
- Lead groups contain routing criteria
- Leads have a history of status changes

## 7. Authentication & Authorization

The system uses session-based authentication with cookies stored in a PostgreSQL session table. 

- **Session Management**: express-session with connect-pg-simple
- **Password Security**: bcrypt for password hashing
- **Role-Based Access**: Different views and permissions for managers vs. agents

## 8. Deployment Strategy

The application is configured to run on Replit's infrastructure with the following characteristics:

- **Build Process**: Vite for frontend, esbuild for backend
- **Runtime Environment**: Node.js 20
- **Database**: PostgreSQL 16 via Neon serverless
- **Deployment Target**: Autoscaling Replit deployment
- **Port Configuration**: Internal port 5000 mapped to external port 80

The system follows a single-build approach where both frontend and backend are compiled together, with the frontend being served as static assets from the backend server.

## 9. Development Considerations

### 9.1 Project Structure

- **/client**: Frontend React application
- **/server**: Backend Express API
- **/shared**: Shared types and schemas
- **/db**: Database configuration and seed data

### 9.2 CI/CD

- Development via the Replit environment
- Build process includes TypeScript compilation and bundling
- Static files are served from the compiled backend application

### 9.3 Environment Configuration

- Configuration through environment variables
- Sensitive credentials like API keys stored in environment variables
- Fallback to database-stored settings for some configurations