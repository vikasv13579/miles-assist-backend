# Backend Developer Round 2 Practical Assignment

This is the complete NestJS backend for the Admin Dashboard practical assignment.

## Tech Stack
- **Framework**: NestJS (Node.js, TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT, Passport, bcrypt
- **Validation**: class-validator, class-transformer
- **Security**: Helmet, Throttler (rate-limiting)
- **API Documentation**: Swagger (OpenAPI)

## Architecture

The project follows a standard NestJS module-based architecture:

- \`src/auth\`: Handles JWT-based authentication and login.
- \`src/dashboard\`: Aggregates statistics, charts, and alerts from the database.
- \`src/users\`: CRUD operations for dashboard users, with pagination, filtering, and sorting.
- \`src/transactions\`: Transactions management.
- \`src/bookings\`: Bookings management with rescheduling validations.
- \`src/prisma\`: Prisma service to interface with PostgreSQL.
- \`src/common\`: Shared DTOs for pagination.

## Database Models & Relationships

- **Admin**: System administrators (used for authentication).
- **User**: Dashboard users.
- **Transaction**: Financial records linked to a User.
- **Booking**: Appointments linked to a User.

\`\`\`mermaid
erDiagram
    ADMIN {
        uuid id PK
        string email UK
        string passwordHash
        datetime createdAt
        datetime updatedAt
    }

    USER {
        uuid id PK
        string email UK
        string name
        string phone
        string status
        datetime createdAt
        datetime updatedAt
    }

    TRANSACTION {
        uuid id PK
        uuid userId FK
        decimal amount
        string status
        string reference UK
        datetime createdAt
        datetime updatedAt
    }

    BOOKING {
        uuid id PK
        uuid userId FK
        string status
        datetime bookingDate
        string reference UK
        datetime createdAt
        datetime updatedAt
    }

    USER ||--o{ TRANSACTION : has
    USER ||--o{ BOOKING : has
\`\`\`

## Setup & Local Development

### 1. Install Dependencies
\`\`\`bash
cd backend
npm install
\`\`\`

### 2. Environment Variables
Copy the example config:
\`\`\`bash
cp .env.example .env
\`\`\`
Ensure your \`.env\` has a valid \`DATABASE_URL\` pointing to a running PostgreSQL instance.

### 3. Database Setup (Migrations & Seed)
\`\`\`bash
# Generate the Prisma Client
npx prisma generate

# Run migrations to build the schema
npx prisma migrate dev

# Seed the database with dummy data
npm run prisma:seed
\`\`\`

### 4. Run the API
\`\`\`bash
# Development mode
npm run start:dev
\`\`\`

## Swagger & API Documentation
Once running, Swagger UI is available at:
[http://localhost:3000/api/docs](http://localhost:3000/api/docs)

## Authentication & Seed Credentials
The seed script creates a test admin account you can use to log in:
- **Email**: \`admin@example.com\`
- **Password**: \`Admin@123\`

Pass these to \`POST /auth/login\` to retrieve a JWT Bearer token, which is required for all other endpoints (including Swagger, where you can paste it in the "Authorize" dialog).

## Production Notes
- The default rate limit is configured to 100 requests per minute globally.
- CORS is enabled (configurable via \`CORS_ORIGIN\`).
- Sensitive data, like password hashes, is never returned in API responses. All errors use a standard NestJS exception filter to avoid leaking stack traces.
