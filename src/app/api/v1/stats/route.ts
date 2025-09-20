import { NextRequest, NextResponse } from 'next/server'
import {
  handleApiRequest,
  createApiResponse,
  createApiError
} from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async (auth) => {
    try {
      // Get overall platform statistics
      const [
        usersResult,
        jobsResult,
        ratingsResult,
        revenueResult
      ] = await Promise.all([
        // User statistics
        auth.supabase
          .from('profiles')
          .select('role', { count: 'exact' }),

        // Job statistics
        auth.supabase
          .from('jobs')
          .select('status, payout_cents', { count: 'exact' }),

        // Rating statistics
        auth.supabase
          .from('ratings')
          .select('on_time, communication, accuracy, condition, compliance, resolution'),

        // Revenue statistics (completed jobs)
        auth.supabase
          .from('jobs')
          .select('payout_cents')
          .in('status', ['delivered', 'paid'])
      ])

      // Process user statistics
      const userStats = {
        total: usersResult.count || 0,
        farmers: 0,
        carriers: 0
      }

      usersResult.data?.forEach(user => {
        if (user.role === 'farmer') userStats.farmers++
        if (user.role === 'carrier') userStats.carriers++
      })

      // Process job statistics
      const jobStats = {
        total: jobsResult.count || 0,
        open: 0,
        accepted: 0,
        in_transit: 0,
        delivered: 0,
        paid: 0,
        cancelled: 0,
        total_value_cents: 0,
        average_payout_cents: 0
      }

      let totalValue = 0
      jobsResult.data?.forEach(job => {
        jobStats[job.status as keyof typeof jobStats]++
        totalValue += job.payout_cents || 0
      })

      jobStats.total_value_cents = totalValue
      jobStats.average_payout_cents = jobStats.total > 0 ? Math.round(totalValue / jobStats.total) : 0

      // Process rating statistics
      const ratingStats = {
        total: ratingsResult.data?.length || 0,
        average_scores: {
          on_time: 0,
          communication: 0,
          accuracy: 0,
          condition: 0,
          compliance: 0,
          resolution: 0,
          overall: 0
        }
      }

      if (ratingStats.total > 0) {
        const totals = {
          on_time: 0,
          communication: 0,
          accuracy: 0,
          condition: 0,
          compliance: 0,
          resolution: 0
        }

        ratingsResult.data?.forEach(rating => {
          Object.keys(totals).forEach(key => {
            totals[key as keyof typeof totals] += rating[key as keyof typeof rating] || 0
          })
        })

        Object.keys(totals).forEach(key => {
          ratingStats.average_scores[key as keyof typeof ratingStats.average_scores] =
            Math.round((totals[key as keyof typeof totals] / ratingStats.total) * 100) / 100
        })

        // Calculate weighted overall score
        const weights = {
          on_time: 0.30,
          communication: 0.15,
          accuracy: 0.20,
          condition: 0.10,
          compliance: 0.15,
          resolution: 0.10
        }

        let weightedSum = 0
        Object.keys(weights).forEach(key => {
          weightedSum += ratingStats.average_scores[key as keyof typeof ratingStats.average_scores] *
                        weights[key as keyof typeof weights]
        })

        ratingStats.average_scores.overall = Math.round(weightedSum * 100) / 100
      }

      // Process revenue statistics
      const revenueStats = {
        completed_jobs: revenueResult.data?.length || 0,
        total_revenue_cents: revenueResult.data?.reduce((sum, job) => sum + (job.payout_cents || 0), 0) || 0,
        average_job_value_cents: 0
      }

      if (revenueStats.completed_jobs > 0) {
        revenueStats.average_job_value_cents = Math.round(revenueStats.total_revenue_cents / revenueStats.completed_jobs)
      }

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const recentActivity = await auth.supabase
        .from('events')
        .select('type, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100)

      const activityStats = {
        total_events: recentActivity.data?.length || 0,
        jobs_posted: 0,
        jobs_accepted: 0,
        jobs_completed: 0,
        routes_declared: 0
      }

      recentActivity.data?.forEach(event => {
        switch (event.type) {
          case 'job_posted':
            activityStats.jobs_posted++
            break
          case 'job_accepted':
            activityStats.jobs_accepted++
            break
          case 'job_delivered':
            activityStats.jobs_completed++
            break
          case 'route_declared':
            activityStats.routes_declared++
            break
        }
      })

      const stats = {
        users: userStats,
        jobs: {
          ...jobStats,
          total_value_dollars: jobStats.total_value_cents / 100,
          average_payout_dollars: jobStats.average_payout_cents / 100
        },
        ratings: ratingStats,
        revenue: {
          ...revenueStats,
          total_revenue_dollars: revenueStats.total_revenue_cents / 100,
          average_job_value_dollars: revenueStats.average_job_value_cents / 100
        },
        recent_activity: activityStats,
        generated_at: new Date().toISOString()
      }

      return NextResponse.json(createApiResponse(
        stats,
        'Platform statistics retrieved successfully'
      ))

    } catch (error: unknown) {
      return createApiError(error instanceof Error ? error.message : "An error occurred", 500)
    }
  })
}