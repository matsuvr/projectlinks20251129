/**
 * 日の出時刻計算ライブラリ
 * 緯度経度から特定日の日の出時刻を計算
 */

// 度をラジアンに変換
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// ラジアンを度に変換
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI)
}

/**
 * 特定の日付・場所の日の出時刻を計算
 * @param lat 緯度
 * @param lng 経度
 * @param date 日付
 * @returns 日の出時刻（HH:MM形式）
 */
export function calculateSunrise(lat: number, lng: number, date: Date): string {
  // 年初からの通算日数
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  const dayOfYear = Math.floor(diff / oneDay)

  // 太陽の赤緯（度）
  const declination = 23.45 * Math.sin(toRadians((360 / 365) * (dayOfYear - 81)))

  // 時角（日の出時の太陽の位置）
  const latRad = toRadians(lat)
  const decRad = toRadians(declination)
  
  // 大気屈折を考慮した日の出角度（-0.833度）
  const sunriseAngle = -0.833
  
  const cosHourAngle = (Math.sin(toRadians(sunriseAngle)) - Math.sin(latRad) * Math.sin(decRad)) / 
                       (Math.cos(latRad) * Math.cos(decRad))
  
  // 緯度が極端な場合（白夜・極夜）
  if (cosHourAngle > 1) return "日の出なし"
  if (cosHourAngle < -1) return "日没なし"
  
  const hourAngle = toDegrees(Math.acos(cosHourAngle))
  
  // 太陽の南中時刻（時間）
  // 均時差を簡易計算
  const B = toRadians((360 / 365) * (dayOfYear - 81))
  const equationOfTime = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)
  
  // 標準時子午線（日本は135度）
  const standardMeridian = 135
  const longitudeCorrection = (standardMeridian - lng) * 4 // 分単位
  
  // 南中時刻（分）
  const solarNoon = 12 * 60 + longitudeCorrection - equationOfTime
  
  // 日の出時刻（分）
  const sunriseMinutes = solarNoon - (hourAngle * 4)
  
  // 時:分に変換
  const hours = Math.floor(sunriseMinutes / 60)
  const minutes = Math.round(sunriseMinutes % 60)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * 2026年1月1日の日の出時刻を計算
 */
export function getSunrise2026NewYear(lat: number, lng: number): string {
  const newYearDate = new Date(2026, 0, 1) // 2026年1月1日
  return calculateSunrise(lat, lng, newYearDate)
}

/**
 * 終電到着から日の出までの待機時間を計算
 * @param lastTrainArrival 終電到着時刻 (HH:MM形式)
 * @param sunriseTime 日の出時刻 (HH:MM形式)
 * @returns 待機時間（時間と分）
 */
export function calculateWaitTime(lastTrainArrival: string, sunriseTime: string): { hours: number; minutes: number } | null {
  if (!lastTrainArrival || sunriseTime === "日の出なし" || sunriseTime === "日没なし") {
    return null
  }
  
  const [arrivalHour, arrivalMinute] = lastTrainArrival.split(':').map(Number)
  const [sunriseHour, sunriseMinute] = sunriseTime.split(':').map(Number)
  
  // 終電到着は深夜（前日）、日の出は翌朝として計算
  let arrivalTotalMinutes = arrivalHour * 60 + arrivalMinute
  let sunriseTotalMinutes = sunriseHour * 60 + sunriseMinute
  
  // 終電が24時以降（0時台）の場合は前日として扱う
  if (arrivalHour < 12) {
    arrivalTotalMinutes += 0 // 既に翌日扱い
  }
  
  // 日の出が朝の場合、終電深夜からの時間を計算
  if (sunriseTotalMinutes < arrivalTotalMinutes) {
    // 終電が深夜(例: 00:19)、日の出が朝(例: 06:50)
    sunriseTotalMinutes += 24 * 60
  }
  
  const waitMinutes = sunriseTotalMinutes - arrivalTotalMinutes
  
  // 終電が深夜0時台の場合の調整
  const adjustedWaitMinutes = waitMinutes > 12 * 60 ? waitMinutes : waitMinutes + 24 * 60
  const finalWaitMinutes = waitMinutes < 12 * 60 ? waitMinutes : adjustedWaitMinutes - 24 * 60
  
  // 実際の待機時間（終電到着から日の出まで）
  const actualWait = sunriseTotalMinutes - arrivalTotalMinutes
  const normalizedWait = actualWait < 0 ? actualWait + 24 * 60 : actualWait
  
  return {
    hours: Math.floor(normalizedWait / 60),
    minutes: normalizedWait % 60
  }
}

/**
 * 待機時間を日本語文字列に変換
 */
export function formatWaitTime(waitTime: { hours: number; minutes: number } | null): string {
  if (!waitTime) return "計算不可"
  return `${waitTime.hours}時間${waitTime.minutes}分`
}
