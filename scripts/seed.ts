import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set in .env.local')
  process.exit(1)
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedData() {
  try {
    console.log('🌱 Starting seed process...')

    // Demo users
    const demoUsers = [
      {
        email: 'farmer1@demo.com',
        password: 'demo123',
        role: 'farmer' as const,
        name: 'John Smith',
        phone: '+1-555-0101',
        crops: ['corn', 'soybeans', 'wheat'],
        home_location: `POINT(-94.5786 39.0997)`, // Kansas City, MO
      },
      {
        email: 'farmer2@demo.com',
        password: 'demo123',
        role: 'farmer' as const,
        name: 'Sarah Johnson',
        phone: '+1-555-0102',
        crops: ['cotton', 'peanuts'],
        home_location: `POINT(-84.3880 33.7490)`, // Atlanta, GA
      },
      {
        email: 'carrier1@demo.com',
        password: 'demo123',
        role: 'carrier' as const,
        name: 'Mike Wilson',
        phone: '+1-555-0201',
        equipment: ['flatbed', 'refrigerated'],
        home_location: `POINT(-87.6298 41.8781)`, // Chicago, IL
      },
      {
        email: 'carrier2@demo.com',
        password: 'demo123',
        role: 'carrier' as const,
        name: 'Lisa Davis',
        phone: '+1-555-0202',
        equipment: ['dry van', 'hopper'],
        home_location: `POINT(-95.3698 29.7604)`, // Houston, TX
      },
    ]

    const createdUsers = []

    // Create users and profiles
    for (const userData of demoUsers) {
      console.log(`Creating user: ${userData.email}`)

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
      })

      if (authError) {
        if (authError.message.includes('already been registered')) {
          console.log(`User ${userData.email} already exists, checking profile...`)

          // Try to get existing user by email
          const { data: existingUsers } = await supabase.auth.admin.listUsers()
          const existingUser = existingUsers.users.find(u => u.email === userData.email)

          if (existingUser) {
            // Check if profile exists
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', existingUser.id)
              .single()

            if (existingProfile) {
              console.log(`✅ Profile exists for ${userData.email}`)
              createdUsers.push({
                ...userData,
                id: existingUser.id,
              })
            } else {
              // Create missing profile
              const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                  id: existingUser.id,
                  role: userData.role,
                  name: userData.name,
                  phone: userData.phone || null,
                  equipment: userData.equipment || [],
                  crops: userData.crops || [],
                  home_location: userData.home_location,
                  trust_score: 50 + Math.floor(Math.random() * 30),
                })

              if (profileError) {
                console.error(`Error creating profile for ${userData.email}:`, profileError)
              } else {
                console.log(`✅ Created profile for existing user: ${userData.email}`)
                createdUsers.push({
                  ...userData,
                  id: existingUser.id,
                })
              }
            }
          }
        } else {
          console.error(`Error creating user ${userData.email}:`, authError)
        }
        continue
      }

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            role: userData.role,
            name: userData.name,
            phone: userData.phone,
            equipment: userData.equipment || [],
            crops: userData.crops || [],
            home_location: userData.home_location,
            trust_score: 50 + Math.floor(Math.random() * 30), // Random score 50-80
          })

        if (profileError) {
          console.error(`Error creating profile for ${userData.email}:`, profileError)
        } else {
          createdUsers.push({
            ...userData,
            id: authData.user.id,
          })
          console.log(`✅ Created user and profile: ${userData.email}`)
        }
      }
    }

    // Create demo jobs
    const farmers = createdUsers.filter(u => u.role === 'farmer')
    const carriers = createdUsers.filter(u => u.role === 'carrier')

    if (farmers.length === 0) {
      console.error('No farmers created, skipping job creation')
      return
    }

    const demoJobs = [
      {
        farmer_id: farmers[0].id,
        crop: 'Corn',
        equipment_needed: ['dry van'],
        pickup_point: `POINT(-94.5786 39.0997)`, // Kansas City, MO
        dropoff_point: `POINT(-87.6298 41.8781)`, // Chicago, IL
        pickup_address: 'Kansas City, MO',
        dropoff_address: 'Chicago, IL',
        load_size: 25.5,
        payout_cents: 150000, // $1,500
        is_perishable: false,
        notes: 'Standard corn delivery, no special handling required',
        status: 'open',
      },
      {
        farmer_id: farmers[0].id,
        crop: 'Soybeans',
        equipment_needed: ['hopper'],
        pickup_point: `POINT(-94.5786 39.0997)`, // Kansas City, MO
        dropoff_point: `POINT(-95.3698 29.7604)`, // Houston, TX
        pickup_address: 'Kansas City, MO',
        dropoff_address: 'Houston, TX',
        load_size: 22.0,
        payout_cents: 180000, // $1,800
        is_perishable: false,
        status: 'accepted',
        carrier_id: carriers[1]?.id,
      },
      {
        farmer_id: farmers[1]?.id || farmers[0].id,
        crop: 'Cotton',
        equipment_needed: ['flatbed'],
        pickup_point: `POINT(-84.3880 33.7490)`, // Atlanta, GA
        dropoff_point: `POINT(-80.8431 35.2271)`, // Charlotte, NC
        pickup_address: 'Atlanta, GA',
        dropoff_address: 'Charlotte, NC',
        load_size: 18.0,
        payout_cents: 120000, // $1,200
        is_perishable: false,
        status: 'open',
      },
      {
        farmer_id: farmers[1]?.id || farmers[0].id,
        crop: 'Fresh Produce',
        equipment_needed: ['refrigerated'],
        pickup_point: `POINT(-84.3880 33.7490)`, // Atlanta, GA
        dropoff_point: `POINT(-75.1652 39.9526)`, // Philadelphia, PA
        pickup_address: 'Atlanta, GA',
        dropoff_address: 'Philadelphia, PA',
        load_size: 15.5,
        payout_cents: 220000, // $2,200
        is_perishable: true,
        notes: 'Temperature controlled transport required. Must maintain 35-38°F',
        status: 'in_transit',
        carrier_id: carriers[0]?.id,
      },
      {
        farmer_id: farmers[0].id,
        crop: 'Wheat',
        equipment_needed: ['dry van'],
        pickup_point: `POINT(-101.8313 35.2220)`, // Amarillo, TX
        dropoff_point: `POINT(-105.0178 39.7392)`, // Denver, CO
        pickup_address: 'Amarillo, TX',
        dropoff_address: 'Denver, CO',
        load_size: 28.0,
        payout_cents: 160000, // $1,600
        is_perishable: false,
        status: 'delivered',
        carrier_id: carriers[1]?.id,
      },
      {
        farmer_id: farmers[1]?.id || farmers[0].id,
        crop: 'Peanuts',
        equipment_needed: ['dry van'],
        pickup_point: `POINT(-84.3880 33.7490)`, // Atlanta, GA
        dropoff_point: `POINT(-86.7816 36.1627)`, // Nashville, TN
        pickup_address: 'Atlanta, GA',
        dropoff_address: 'Nashville, TN',
        load_size: 12.0,
        payout_cents: 95000, // $950
        is_perishable: false,
        status: 'open',
      },
    ]

    for (const jobData of demoJobs) {
      const { error: jobError } = await supabase
        .from('jobs')
        .insert(jobData)

      if (jobError) {
        console.error('Error creating job:', jobError)
      } else {
        console.log(`✅ Created job: ${jobData.crop} (${jobData.status})`)
      }
    }

    // Create some sample events
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, farmer_id, carrier_id, status')

    if (jobs && jobs.length > 0) {
      for (const job of jobs) {
        if (job.status !== 'open') {
          // Add job accepted event
          await supabase
            .from('events')
            .insert({
              job_id: job.id,
              user_id: job.carrier_id,
              type: 'job_accepted',
            })

          if (job.status === 'in_transit' || job.status === 'delivered') {
            // Add job started event
            await supabase
              .from('events')
              .insert({
                job_id: job.id,
                user_id: job.carrier_id,
                type: 'job_started',
              })
          }

          if (job.status === 'delivered') {
            // Add job delivered event
            await supabase
              .from('events')
              .insert({
                job_id: job.id,
                user_id: job.carrier_id,
                type: 'job_delivered',
              })
          }
        }
      }
      console.log('✅ Created sample events')
    }

    // Create sample ratings for completed jobs
    const completedJobs = jobs?.filter(j => j.status === 'delivered') || []
    for (const job of completedJobs.slice(0, 2)) { // Limit to first 2 completed jobs
      // Farmer rates carrier
      await supabase
        .from('ratings')
        .insert({
          job_id: job.id,
          rater_id: job.farmer_id,
          ratee_id: job.carrier_id,
          on_time: 8 + Math.floor(Math.random() * 3), // 8-10
          communication: 7 + Math.floor(Math.random() * 3), // 7-9
          accuracy: 8 + Math.floor(Math.random() * 3), // 8-10
          condition: 9 + Math.floor(Math.random() * 2), // 9-10
          compliance: 8 + Math.floor(Math.random() * 3), // 8-10
          resolution: 8 + Math.floor(Math.random() * 3), // 8-10
          comment: 'Great job, professional service and on-time delivery!',
        })

      // Carrier rates farmer
      await supabase
        .from('ratings')
        .insert({
          job_id: job.id,
          rater_id: job.carrier_id,
          ratee_id: job.farmer_id,
          on_time: 8 + Math.floor(Math.random() * 3), // 8-10
          communication: 8 + Math.floor(Math.random() * 3), // 8-10
          accuracy: 9 + Math.floor(Math.random() * 2), // 9-10
          condition: 8 + Math.floor(Math.random() * 3), // 8-10
          compliance: 9 + Math.floor(Math.random() * 2), // 9-10
          resolution: 8 + Math.floor(Math.random() * 3), // 8-10
          comment: 'Easy pickup, clear instructions, and fair payment.',
        })
    }

    console.log('✅ Created sample ratings')

    console.log('\n🎉 Seed completed successfully!')
    console.log('\n📋 Demo Accounts:')
    console.log('Farmers:')
    console.log('  - farmer1@demo.com / demo123 (John Smith)')
    console.log('  - farmer2@demo.com / demo123 (Sarah Johnson)')
    console.log('Carriers:')
    console.log('  - carrier1@demo.com / demo123 (Mike Wilson)')
    console.log('  - carrier2@demo.com / demo123 (Lisa Davis)')

  } catch (error) {
    console.error('❌ Seed failed:', error)
  }
}

seedData()