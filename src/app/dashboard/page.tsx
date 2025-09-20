'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Job, Profile } from '@/lib/types'

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-full bg-gray-100 flex items-center justify-center">Loading map...</div>
})

export default function Dashboard() {
  const { user, profile, loading: authLoading, signOut } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [carriers, setCarriers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('jobs')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    if (!user || !profile) return

    const fetchData = async () => {
      try {
        // Fetch jobs
        const { data: jobsData } = await supabase
          .from('jobs')
          .select(`
            *,
            farmer:profiles!farmer_id(id, name, trust_score),
            carrier:profiles!carrier_id(id, name, trust_score)
          `)
          .order('posted_at', { ascending: false })

        // Fetch carriers for map
        const { data: carriersData } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'carrier')
          .not('home_location', 'is', null)

        setJobs(jobsData || [])
        setCarriers(carriersData || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Set up realtime subscriptions
    const jobsSubscription = supabase
      .channel('jobs')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        (payload) => {
          console.log('Job change:', payload)
          fetchData() // Refresh data on changes
        }
      )
      .subscribe()

    return () => {
      jobsSubscription.unsubscribe()
    }
  }, [user, profile, supabase])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>Profile not found</p>
      </div>
    )
  }

  const myJobs = jobs.filter(job =>
    job.farmer_id === profile.id || job.carrier_id === profile.id
  )

  const availableJobs = jobs.filter(job =>
    job.status === 'open' && job.farmer_id !== profile.id
  )

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-96' : 'w-0'} transition-all duration-300 bg-white shadow-lg flex flex-col overflow-hidden`}>
        {sidebarOpen && (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-green-500 to-blue-500 text-white">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-xl font-bold">AgriHaul</h1>
                <button
                  onClick={signOut}
                  className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded"
                >
                  Sign Out
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span>{profile.role === 'farmer' ? '🚜' : '🚚'}</span>
                <div>
                  <p className="font-medium">{profile.name}</p>
                  <p className="text-sm opacity-90">
                    Trust Score: {profile.trust_score}/100
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('jobs')}
                className={`flex-1 py-3 px-4 text-sm font-medium ${
                  activeTab === 'jobs'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Available Jobs ({availableJobs.length})
              </button>
              <button
                onClick={() => setActiveTab('my-jobs')}
                className={`flex-1 py-3 px-4 text-sm font-medium ${
                  activeTab === 'my-jobs'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                My Jobs ({myJobs.length})
              </button>
              {profile.role === 'farmer' && (
                <button
                  onClick={() => setActiveTab('post-job')}
                  className={`flex-1 py-3 px-4 text-sm font-medium ${
                    activeTab === 'post-job'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Post Job
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'jobs' && (
                <div className="space-y-4">
                  {availableJobs.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No available jobs</p>
                  ) : (
                    availableJobs.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        isOwner={false}
                        userRole={profile.role}
                      />
                    ))
                  )}
                </div>
              )}

              {activeTab === 'my-jobs' && (
                <div className="space-y-4">
                  {myJobs.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No jobs yet</p>
                  ) : (
                    myJobs.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        isOwner={job.farmer_id === profile.id}
                        userRole={profile.role}
                      />
                    ))
                  )}
                </div>
              )}

              {activeTab === 'post-job' && profile.role === 'farmer' && (
                <PostJobForm onJobPosted={() => setActiveTab('my-jobs')} />
              )}
            </div>
          </>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-4 left-4 z-10 bg-white hover:bg-gray-50 p-2 rounded-lg shadow-lg"
        >
          {sidebarOpen ? '←' : '→'}
        </button>

        <Map
          jobs={jobs}
          carriers={carriers}
          onJobClick={(job) => {
            console.log('Job clicked:', job)
            // Could open job details modal
          }}
          onCarrierClick={(carrier) => {
            console.log('Carrier clicked:', carrier)
            // Could open carrier profile modal
          }}
          className="h-full"
        />
      </div>
    </div>
  )
}

function JobCard({
  job,
  isOwner,
  userRole
}: {
  job: Job
  isOwner: boolean
  userRole: 'farmer' | 'carrier'
}) {
  const supabase = createClient()

  const handleAcceptJob = async () => {
    if (userRole !== 'carrier' || job.status !== 'open') return

    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'accepted',
          carrier_id: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', job.id)

      if (error) throw error

      // Add event
      await supabase
        .from('events')
        .insert({
          job_id: job.id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          type: 'job_accepted'
        })

      alert('Job accepted successfully!')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred'
      alert('Error accepting job: ' + message)
    }
  }

  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{job.crop}</h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          job.status === 'open' ? 'bg-green-100 text-green-800' :
          job.status === 'accepted' ? 'bg-yellow-100 text-yellow-800' :
          job.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
          job.status === 'delivered' ? 'bg-gray-100 text-gray-800' :
          'bg-red-100 text-red-800'
        }`}>
          {job.status}
        </span>
      </div>

      <div className="space-y-1 text-sm text-gray-600 mb-3">
        <p>Load Size: {job.load_size} tons</p>
        <p>Payout: ${(job.payout_cents / 100).toFixed(2)}</p>
        {job.pickup_address && <p>Pickup: {job.pickup_address}</p>}
        {job.dropoff_address && <p>Dropoff: {job.dropoff_address}</p>}
        {job.is_perishable && (
          <p className="text-orange-600 font-medium">⚠️ Perishable</p>
        )}
        {job.farmer && (
          <p>Farmer: {job.farmer.name} (Trust: {job.farmer.trust_score}/100)</p>
        )}
      </div>

      <div className="flex gap-2">
        {!isOwner && userRole === 'carrier' && job.status === 'open' && (
          <button
            onClick={handleAcceptJob}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm font-medium"
          >
            Accept Job
          </button>
        )}

        <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded text-sm font-medium">
          View Details
        </button>
      </div>
    </div>
  )
}

function PostJobForm({ onJobPosted }: { onJobPosted: () => void }) {
  const [formData, setFormData] = useState({
    crop: '',
    load_size: '',
    payout_cents: '',
    pickup_address: '',
    dropoff_address: '',
    equipment_needed: '',
    is_perishable: false,
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('Not authenticated')

      // For demo, use default coordinates (would normally geocode addresses)
      const pickup_point = { coordinates: [-98.5795, 39.8283] } // Default center USA
      const dropoff_point = { coordinates: [-98.5795, 39.8283] }

      const { error } = await supabase
        .from('jobs')
        .insert({
          farmer_id: user.id,
          crop: formData.crop,
          load_size: parseFloat(formData.load_size),
          payout_cents: parseInt(formData.payout_cents) * 100,
          pickup_address: formData.pickup_address,
          dropoff_address: formData.dropoff_address,
          pickup_point,
          dropoff_point,
          equipment_needed: formData.equipment_needed ? formData.equipment_needed.split(',').map(s => s.trim()) : [],
          is_perishable: formData.is_perishable,
          notes: formData.notes
        })

      if (error) throw error

      alert('Job posted successfully!')
      setFormData({
        crop: '',
        load_size: '',
        payout_cents: '',
        pickup_address: '',
        dropoff_address: '',
        equipment_needed: '',
        is_perishable: false,
        notes: ''
      })
      onJobPosted()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred'
      alert('Error posting job: ' + message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Crop
        </label>
        <input
          type="text"
          value={formData.crop}
          onChange={(e) => setFormData({...formData, crop: e.target.value})}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Corn, Soybeans, Wheat"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Load Size (tons)
        </label>
        <input
          type="number"
          step="0.1"
          value={formData.load_size}
          onChange={(e) => setFormData({...formData, load_size: e.target.value})}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Payout ($)
        </label>
        <input
          type="number"
          value={formData.payout_cents}
          onChange={(e) => setFormData({...formData, payout_cents: e.target.value})}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Pickup Address
        </label>
        <input
          type="text"
          value={formData.pickup_address}
          onChange={(e) => setFormData({...formData, pickup_address: e.target.value})}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dropoff Address
        </label>
        <input
          type="text"
          value={formData.dropoff_address}
          onChange={(e) => setFormData({...formData, dropoff_address: e.target.value})}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Equipment Needed (comma-separated)
        </label>
        <input
          type="text"
          value={formData.equipment_needed}
          onChange={(e) => setFormData({...formData, equipment_needed: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Refrigerated truck, Flatbed"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="perishable"
          checked={formData.is_perishable}
          onChange={(e) => setFormData({...formData, is_perishable: e.target.checked})}
          className="mr-2"
        />
        <label htmlFor="perishable" className="text-sm text-gray-700">
          Perishable cargo
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Additional Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-4 rounded font-medium"
      >
        {loading ? 'Posting...' : 'Post Job'}
      </button>
    </form>
  )
}