# HVAC Commissioning Logger

A field-friendly web application for logging envelope and HVAC commissioning tests, attaching evidence, and auto-generating professional PDF reports.

## Features

- **Project Management**: Organize work by Project → Building/Wing → Session → Unit/Zone structure
- **HVAC Commissioning**: Airflow testing, static pressure, refrigerant circuits, coil performance
- **Envelope Investigation**: Building pressure, pressure decay, leakage testing, moisture assessment
- **Real-time Calculations**: Auto-compute CFM/ton, dew point, superheat/subcooling with pass/fail criteria
- **Evidence Collection**: Attach photos, IR images, nameplates, and documents
- **Professional Reports**: Generate comprehensive PDF reports with charts and photos
- **Role-based Access**: Admin, Engineer, and Viewer roles with project-level permissions

## Tech Stack

- **Framework**: Next.js 14 (App Router, React Server Components)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (Email/Password + Google/Microsoft OAuth)
- **UI**: TailwindCSS + shadcn/ui components
- **File Storage**: S3-compatible storage
- **PDF Generation**: React-PDF
- **Validation**: Zod schemas
- **Charts**: Recharts

## Quick Start

### 1. Clone and Install

```bash
git clone <repository>
cd hvac-logger
npm install
```

### 2. Environment Setup

Copy `env.example` to `.env.local` and configure:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/hvac_logger?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# AWS S3 (optional for file uploads)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="hvac-logger-files"
```

### 3. Database Setup

```bash
# Push schema to database
npm run db:push

# Seed with demo data
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Demo Credentials

After running the seed script, you can login with:

- **Admin**: admin@permitzip.com / admin123
- **Engineer**: engineer@permitzip.com / engineer123

## Test Data Structure

The application includes comprehensive validation schemas for all test types:

### Envelope Tests (A1-A4)

- **Building Pressure**: Target 0.02-0.05 in. w.c.
- **Pressure Decay**: Tracks decay rate over time
- **Return/Curb Leakage**: Smoke testing and pressure analysis
- **Slab/Wall Moisture**: Plastic sheet testing and IR findings

### HVAC Tests (B1-B6)

- **Airflow & Static**: CFM/ton calculations (350-400 target for dehum)
- **Refrigerant Circuit**: Superheat/subcooling with pressure/temperature
- **Coil Performance**: Supply dew point targets (50-55°F)
- **Fan/Evap Recheck**: Post-adjustment verification
- **Economizer Seal**: Leakage testing at 0% position
- **Distribution & Mixing**: Zone temperature/humidity uniformity

## API Endpoints

- `POST /api/auth/register` - User registration
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create new project
- `GET /api/organizations` - List organizations
- `POST /api/tests` - Submit test results
- `GET /api/tests?sessionId=x` - Get session test results

## Development

### Database Changes

```bash
# After modifying schema.prisma
npm run db:push

# Generate Prisma client
npx prisma generate
```

### Adding New Test Types

1. Add to `TestType` enum in `prisma/schema.prisma`
2. Create Zod schema in `src/lib/schemas.ts`
3. Add computation logic in `src/lib/test-computations.ts`
4. Create form component for data entry

## Deployment

### Vercel (Recommended)

1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy with PostgreSQL database (Neon, Supabase, or AWS RDS)

### Docker

```bash
docker build -t hvac-logger .
docker run -p 3000:3000 hvac-logger
```

## Architecture

```
src/
├── app/                  # Next.js 14 app router
│   ├── api/             # API routes
│   ├── login/           # Authentication pages
│   ├── projects/        # Project management
│   └── sessions/        # Test session pages
├── components/          # React components
│   └── ui/             # shadcn/ui components
├── lib/                # Utility functions
│   ├── auth.ts         # NextAuth configuration
│   ├── db.ts           # Prisma client
│   ├── schemas.ts      # Zod validation schemas
│   ├── calculations.ts # Engineering calculations
│   └── test-computations.ts # Test result processing
└── types/              # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

Built with ❤️ for HVAC commissioning professionals.
