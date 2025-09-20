'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Icon } from 'leaflet'
import { Job, Profile } from '@/lib/types'

interface MapProps {
  jobs: Job[]
  carriers: Profile[]
  onJobClick?: (job: Job) => void
  onCarrierClick?: (carrier: Profile) => void
  center?: [number, number]
  zoom?: number
  className?: string
}

const jobIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiMxMEI5ODEiLz4KPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI0IiB5PSI0Ij4KPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIgMTAuNUwyIDEwTDEuNSA5LjVMMiA5TDIgOC41SDE0VjEwLjVIMloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik02IDZMNCA3LjVMNiA5SDEwTDEyIDcuNUwxMCA2SDZaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjIiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4=',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

const carrierIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiMzQjgyRjYiLz4KPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI0IiB5PSI0Ij4KPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIgMTBIMTQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik02IDZIMTBMTTggOEg0TDYgNloiIGZpbGw9IndoaXRlIi8+CjxjaXJjbGUgY3g9IjQiIGN5PSIxMiIgcj0iMiIgZmlsbD0id2hpdGUiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+CjwvZz4KPC9zdmc+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjIiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4=',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])

  return null
}

export default function Map({
  jobs,
  carriers,
  onJobClick,
  onCarrierClick,
  center = [39.8283, -98.5795], // Center of USA
  zoom = 5,
  className = ""
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null)

  return (
    <div className={`h-full w-full ${className}`}>
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater center={center} zoom={zoom} />

        {jobs.map((job) => {
          if (!job.pickup_point?.coordinates) return null

          const [lng, lat] = job.pickup_point.coordinates
          return (
            <Marker
              key={`job-${job.id}`}
              position={[lat, lng]}
              icon={jobIcon}
              eventHandlers={{
                click: () => onJobClick?.(job)
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-sm">{job.crop}</h3>
                  <p className="text-xs text-gray-600">
                    Load: {job.load_size} tons
                  </p>
                  <p className="text-xs text-gray-600">
                    ${(job.payout_cents / 100).toFixed(2)}
                  </p>
                  <p className="text-xs">
                    Status: <span className={`
                      ${job.status === 'open' ? 'text-green-600' : ''}
                      ${job.status === 'accepted' ? 'text-yellow-600' : ''}
                      ${job.status === 'in_transit' ? 'text-blue-600' : ''}
                      ${job.status === 'delivered' ? 'text-gray-600' : ''}
                    `}>
                      {job.status}
                    </span>
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {carriers.map((carrier) => {
          if (!carrier.home_location?.coordinates) return null

          const [lng, lat] = carrier.home_location.coordinates
          return (
            <Marker
              key={`carrier-${carrier.id}`}
              position={[lat, lng]}
              icon={carrierIcon}
              eventHandlers={{
                click: () => onCarrierClick?.(carrier)
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-sm">{carrier.name}</h3>
                  <p className="text-xs text-gray-600">
                    Trust Score: {carrier.trust_score}/100
                  </p>
                  {carrier.equipment && carrier.equipment.length > 0 && (
                    <p className="text-xs text-gray-600">
                      Equipment: {carrier.equipment.join(', ')}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}