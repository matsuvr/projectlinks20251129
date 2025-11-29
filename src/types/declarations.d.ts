declare module '*.geojson' {
  const value: {
    type: string
    features: unknown[]
    [key: string]: unknown
  }
  export default value
}

declare module 'leaflet/dist/leaflet.css'
