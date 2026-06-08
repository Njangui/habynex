'use client'

import { useEffect, useRef } from 'react'

interface MapViewProps {
  lat: number
  lng: number
  title: string
  neighborhoodName?: string
  zoom?: number
  height?: string
}

export function MapView({
  lat, lng, title, neighborhoodName, zoom = 15, height = '280px'
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Import dynamique Leaflet — vanilla JS uniquement, pas react-leaflet
    async function initMap() {
      const L = (await import('leaflet')).default

      // Injecter le CSS Leaflet dynamiquement
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:36px;height:36px;
          background:#f95d1e;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          border:3px solid white;
          box-shadow:0 2px 8px rgba(249,93,30,0.5);
          display:flex;align-items:center;justify-content:center;
        ">
          <span style="transform:rotate(45deg);font-size:14px;">🏠</span>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -40],
      })

      const map = L.map(mapRef.current!, {
        center: [lat, lng],
        zoom,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map)

      L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(
          `<strong>${title}</strong>${neighborhoodName ? `<br/><small>${neighborhoodName}, Yaoundé</small>` : ''}`
        )
        .openPopup()

      mapInstanceRef.current = map
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [lat, lng, title, neighborhoodName, zoom])

  return (
    <div
      ref={mapRef}
      style={{ height }}
      className="w-full rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
      aria-label={`Carte — ${title}`}
    />
  )
}
