import Link from 'next/link'

export default function About() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          About
        </h1>
        <div className="text-center space-y-4">
          <p className="text-lg text-gray-600">
            このテンプレートは以下の機能を含んでいます：
          </p>
          <ul className="text-left max-w-md mx-auto space-y-2">
            <li>• Next.js 14 with App Router</li>
            <li>• TypeScript サポート</li>
            <li>• Tailwind CSS（基本的なスタイリング）</li>
            <li>• AWS Amplify デプロイメント設定</li>
            <li>• 静的エクスポート設定</li>
          </ul>
          <div className="mt-8">
            <Link 
              href="/" 
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}