import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          Next.js Amplify Template
        </h1>
        <div className="text-center space-y-4">
          <p className="text-lg text-gray-600">
            AWS Amplifyにデプロイする準備ができたNext.jsテンプレートです。
          </p>
          <div className="flex justify-center space-x-4">
            <Link 
              href="/about" 
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Aboutページ
            </Link>
            <Link 
              href="/map" 
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              沿岸駅マップ
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}