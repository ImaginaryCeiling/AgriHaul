# Convoy for Agriculture 🚜🚚

A two-sided marketplace connecting **Farmers** (post loads) and **Carriers** (accept loads) for agricultural transportation. Built as a production-ready MVP featuring real-time maps, job management, trust scoring, and proof of delivery.

## ✨ Features

- **Two-sided marketplace** - Farmers post jobs, carriers accept them
- **Interactive map** - Real-time visualization of jobs and carrier locations
- **Trust scoring system** - Reputation system with weighted ratings
- **Proof of delivery** - Photo upload for completed jobs
- **Real-time updates** - Live job status and map updates
- **Crowdsourcing support** - Carriers can accept multiple partial loads along routes
- **Mobile responsive** - Works on all devices
- **Secure authentication** - Row-level security with Supabase

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Postgres, RLS, Realtime, Storage)
- **Maps**: React Leaflet with OpenStreetMap tiles (no API keys required)
- **Testing**: Playwright for E2E tests
- **Deployment**: Ready for Vercel deployment

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)

### 1. Clone and Install

```bash
git clone <your-repo>
cd agrihaul
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Run the database schema:

```sql
-- Copy and paste the contents of supabase/schema.sql
-- into your Supabase SQL editor and run it
```

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Seed Demo Data

```bash
npm run seed
```

This creates demo users and sample jobs for testing.

### 5. Start Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 👥 Demo Accounts

After running the seed script, you can use these accounts:

### Farmers
- **farmer1@demo.com** / `demo123` (John Smith)
- **farmer2@demo.com** / `demo123` (Sarah Johnson)

### Carriers
- **carrier1@demo.com** / `demo123` (Mike Wilson)
- **carrier2@demo.com** / `demo123` (Lisa Davis)

## 🎯 Core User Flows

### Farmer Flow
1. Sign up → Select "I'm a Farmer" → Create account
2. Dashboard → "Post Job" tab → Fill form → Submit
3. Monitor job status in "My Jobs" tab
4. Mark job as paid when delivered
5. Rate carrier after completion

### Carrier Flow
1. Sign up → Select "I'm a Carrier" → Create account
2. Dashboard → Browse "Available Jobs"
3. Accept job → Status changes to "accepted"
4. Update status: accepted → in_transit → delivered
5. Upload proof of delivery photo
6. Rate farmer after completion

### Trust Score System
- Automatically calculated after each job completion
- Based on: On-time (30%), Accuracy (20%), Communication (15%), Compliance (15%), Condition (10%), Resolution (10%)
- Formula: `new_score = old_score * 0.8 + job_score * 0.2`

## 🗺️ Map Features

- **Green pins**: Available jobs (open status)
- **Yellow pins**: Accepted/in-progress jobs
- **Gray pins**: Completed jobs
- **Blue pins**: Carrier locations
- **Interactive**: Click markers for details
- **Toggle layers**: Show/hide jobs vs carriers

## 🛠️ Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run seed         # Seed demo data
npm run test         # Run Playwright tests
npm run test:headed  # Run tests with browser UI
```

## 🧪 Testing

The project includes Playwright E2E tests covering:

- User authentication flow
- Job posting and acceptance
- Status transitions
- Map functionality

```bash
# Run all tests
npm run test

# Run tests with browser visible
npm run test:headed

# Run specific test file
npx playwright test tests/auth.test.ts
```

## 📊 Database Schema

### Core Tables

- **profiles** - User profiles (farmers/carriers) with trust scores
- **jobs** - Job postings with pickup/dropoff locations
- **job_segments** - For crowdsourcing (partial loads)
- **events** - Audit trail of all status changes
- **pod_assets** - Proof of delivery photos
- **ratings** - Rating system for trust scores

### Key Features

- **PostGIS** for geospatial queries
- **Row Level Security** for data access control
- **Realtime subscriptions** for live updates
- **Triggers** for automatic trust score calculation
- **Storage** for proof of delivery images

## 🔐 Security

- **Authentication**: Supabase Auth with email/password
- **Authorization**: Row-level security policies
- **Data Privacy**: Users can only see relevant data
- **File Security**: Secure image upload to Supabase Storage

## 🚀 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
```

## 🔄 API Routes

- `POST /api/jobs` - Create new job (farmers only)
- `POST /api/jobs/[id]/accept` - Accept job (carriers only)
- `POST /api/jobs/[id]/status` - Update job status
- `POST /api/jobs/[id]/pod` - Upload proof of delivery
- `POST /api/ratings` - Submit rating (triggers trust score update)
- `POST /api/carrier/route` - Declare carrier route for crowdsourcing

## 🎨 Customization

### Adding New Crop Types

Edit the crop options in `src/app/dashboard/page.tsx` in the PostJobForm component.

### Modifying Trust Score Weights

Update the calculation in `supabase/schema.sql` in the `calculate_job_score` function.

### Styling Changes

All styles use Tailwind CSS. Modify classes throughout the components or update `tailwind.config.js`.

## 🧩 Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   └── jobs/              # Job detail pages
├── components/            # Reusable components
├── contexts/              # React contexts (auth)
├── lib/                   # Utilities and types
│   ├── supabase/         # Supabase clients
│   └── types.ts          # TypeScript definitions
└── middleware.ts         # Auth middleware
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**Map not loading**: Ensure Leaflet CSS is imported in `globals.css`

**Auth errors**: Verify Supabase environment variables are correct

**Database errors**: Make sure you've run the schema SQL in Supabase

**Seed script fails**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly

### Getting Help

1. Check the [Issues](../../issues) for common problems
2. Review Supabase logs in your dashboard
3. Check browser console for client-side errors

---

**Happy hauling!** 🌾✨
