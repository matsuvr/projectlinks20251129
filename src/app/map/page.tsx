'use client'

import dynamic from 'next/dynamic'

// Leafletはサーバーサイドでは動作しないためdynamic importを使用
const StationMap = dynamic(() => import('@/components/StationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100">
      <div className="text-xl text-gray-600">地図を読み込み中...</div>
    </div>
  ),
})

export default function MapPage() {
  return (
    <main className="w-full h-screen">
      <StationMap />
    </main>
  )
}
