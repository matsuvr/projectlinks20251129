import type React from "react"
import type { Metadata, Viewport } from "next"
import { Noto_Sans_JP } from "next/font/google"
import "./globals.css"

const notoSansJP = Noto_Sans_JP({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "初日の出ハンター | 日の出撮影スポット駅マップ",
  description:
    "関東地方の日の出撮影に最適な駅を地図上で探索。東京駅から200km以内・沿岸2km以内の駅を、最終電車情報とともにご紹介。国土地理院の地図を使った、カメラマンのための撮影ポイントガイド。",
  keywords: ["初日の出", "撮影スポット", "駅", "関東", "写真", "地図", "カメラ", "最終電車"],
}

export const viewport: Viewport = {
  themeColor: "#d97706",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.className} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}