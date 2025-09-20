'use client'

import { useEffect, useState } from 'react'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

interface OpenAPISpec {
  openapi: string
  info: {
    title: string
    version: string
    description: string
  }
  paths: Record<string, unknown>
  components?: Record<string, unknown>
}

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch the OpenAPI specification
    fetch('/api/v1/docs')
      .then(response => response.json())
      .then((data: OpenAPISpec) => {
        setSpec(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load API specification')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading API documentation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-gray-800 font-semibold">{error}</p>
          <p className="text-gray-600 mt-2">Please check that the API server is running.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">AgriHaul API Documentation</h1>
          <p className="text-xl text-green-100">
            Interactive API explorer powered by Swagger UI
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full">
              📚 OpenAPI 3.0
            </span>
            <span className="bg-white/20 px-3 py-1 rounded-full">
              🔐 Authentication Required
            </span>
            <span className="bg-white/20 px-3 py-1 rounded-full">
              🚀 Real-time Testing
            </span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <a 
              href="#/Users" 
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              👥 Users API
            </a>
            <a 
              href="#/Jobs" 
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              🚚 Jobs API
            </a>
            <a 
              href="#/Ratings" 
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ⭐ Ratings API
            </a>
            <a 
              href="#/Statistics" 
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              📊 Statistics API
            </a>
          </div>
        </div>
      </div>

      {/* SwaggerUI */}
      <div className="max-w-7xl mx-auto">
        {spec && (
          <SwaggerUI
            spec={spec}
            deepLinking={true}
            displayOperationId={false}
            defaultModelsExpandDepth={1}
            defaultModelExpandDepth={1}
            defaultModelRendering="model"
            displayRequestDuration={true}
            docExpansion="list"
            filter={true}
            showExtensions={true}
            showCommonExtensions={true}
            tryItOutEnabled={true}
          />
        )}
      </div>
    </div>
  )
}