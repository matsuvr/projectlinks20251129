/**
 * Wikipedia/Wikimedia Commons から駅の画像を取得するライブラリ
 * 
 * ライセンス: Wikimedia CommonsのコンテンツはCC BY-SA 4.0等のフリーライセンスで提供されています。
 * 使用時は必ず適切なクレジット（著作者、ライセンス、出典）を表示する必要があります。
 * 
 * 参照: https://api.wikimedia.org/wiki/Reusing_free_content
 */

export interface WikipediaImageInfo {
  url: string           // 画像URL
  thumbUrl: string      // サムネイルURL
  title: string         // ファイル名
  artist?: string       // 著作者
  license?: string      // ライセンス名
  licenseUrl?: string   // ライセンスURL
  descriptionUrl: string // 画像ページURL
}

/**
 * 日本語Wikipediaから駅の画像情報を取得
 * @param stationName 駅名（「駅」は不要）
 */
export async function getStationImage(stationName: string): Promise<WikipediaImageInfo | null> {
  try {
    // 1. まず日本語Wikipediaで駅ページを検索
    const searchTitle = `${stationName}駅`
    const pageInfoUrl = `https://ja.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(searchTitle)}&prop=pageimages|info&piprop=thumbnail|original&pithumbsize=400&format=json&origin=*`
    
    const pageResponse = await fetch(pageInfoUrl)
    const pageData = await pageResponse.json()
    
    const pages = pageData.query?.pages
    if (!pages) return null
    
    const pageId = Object.keys(pages)[0]
    if (pageId === '-1') return null // ページが存在しない
    
    const page = pages[pageId]
    
    // ページに画像がある場合
    if (page.thumbnail?.source || page.original?.source) {
      const imageUrl = page.original?.source || page.thumbnail?.source
      const thumbUrl = page.thumbnail?.source || imageUrl
      
      // 画像のファイル名を抽出
      const fileName = imageUrl.split('/').pop()?.split('?')[0] || ''
      
      // Wikimedia Commonsから詳細なライセンス情報を取得
      const licenseInfo = await getImageLicenseInfo(fileName)
      
      return {
        url: imageUrl,
        thumbUrl: thumbUrl,
        title: fileName,
        artist: licenseInfo?.artist || 'Wikimedia Commons contributors',
        license: licenseInfo?.license || 'CC BY-SA',
        licenseUrl: licenseInfo?.licenseUrl || 'https://creativecommons.org/licenses/by-sa/4.0/',
        descriptionUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`
      }
    }
    
    return null
  } catch (error) {
    console.error('Failed to fetch station image:', error)
    return null
  }
}

/**
 * Wikimedia Commonsから画像のライセンス情報を取得
 */
async function getImageLicenseInfo(fileName: string): Promise<{ artist?: string; license?: string; licenseUrl?: string } | null> {
  try {
    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=extmetadata&format=json&origin=*`
    
    const response = await fetch(commonsUrl)
    const data = await response.json()
    
    const pages = data.query?.pages
    if (!pages) return null
    
    const pageId = Object.keys(pages)[0]
    if (pageId === '-1') return null
    
    const extmetadata = pages[pageId]?.imageinfo?.[0]?.extmetadata
    if (!extmetadata) return null
    
    // 著作者情報（HTMLタグを除去）
    let artist = extmetadata.Artist?.value || ''
    artist = artist.replace(/<[^>]*>/g, '').trim()
    
    // ライセンス情報
    const licenseName = extmetadata.LicenseShortName?.value || extmetadata.License?.value || 'CC BY-SA'
    const licenseUrl = extmetadata.LicenseUrl?.value || 'https://creativecommons.org/licenses/by-sa/4.0/'
    
    return {
      artist: artist || undefined,
      license: licenseName,
      licenseUrl: licenseUrl
    }
  } catch (error) {
    console.error('Failed to fetch license info:', error)
    return null
  }
}

/**
 * 画像クレジットを表示用にフォーマット
 */
export function formatImageCredit(imageInfo: WikipediaImageInfo): string {
  const artist = imageInfo.artist || 'Unknown'
  const license = imageInfo.license || 'CC BY-SA'
  return `Photo: ${artist} / ${license}`
}

/**
 * クレジット表示用のReactコンポーネント用データ
 */
export interface ImageCreditData {
  artistName: string
  artistUrl?: string
  licenseName: string
  licenseUrl: string
  sourceUrl: string
  sourceName: string
}

export function getImageCreditData(imageInfo: WikipediaImageInfo): ImageCreditData {
  return {
    artistName: imageInfo.artist || 'Wikimedia Commons contributors',
    licenseName: imageInfo.license || 'CC BY-SA 4.0',
    licenseUrl: imageInfo.licenseUrl || 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: imageInfo.descriptionUrl,
    sourceName: 'Wikimedia Commons'
  }
}
