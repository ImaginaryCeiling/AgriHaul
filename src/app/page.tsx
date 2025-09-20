import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Convoy for Agriculture
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Connect farmers with carriers. Transport agricultural loads efficiently and build trust through our marketplace.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <Link href="/auth?role=farmer" className="group">
              <div className="bg-green-500 hover:bg-green-600 p-8 rounded-xl text-white transform hover:scale-105 transition-all duration-200">
                <div className="text-4xl mb-4">🚜</div>
                <h2 className="text-2xl font-semibold mb-2">I&apos;m a Farmer</h2>
                <p className="text-green-100">
                  Post loads and find reliable carriers for your crops
                </p>
              </div>
            </Link>

            <Link href="/auth?role=carrier" className="group">
              <div className="bg-blue-500 hover:bg-blue-600 p-8 rounded-xl text-white transform hover:scale-105 transition-all duration-200">
                <div className="text-4xl mb-4">🚚</div>
                <h2 className="text-2xl font-semibold mb-2">I&apos;m a Carrier</h2>
                <p className="text-blue-100">
                  Find loads along your route and maximize your earnings
                </p>
              </div>
            </Link>
          </div>

          <div className="mt-12 space-y-4">
            <div className="text-sm text-gray-500">
              <p>Already have an account? <Link href="/auth" className="text-blue-600 hover:underline">Sign in here</Link></p>
            </div>
            <div className="flex justify-center gap-6 text-sm">
              <Link href="/api/docs" className="text-gray-600 hover:text-blue-600 hover:underline">
                📚 API Documentation
              </Link>
              <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 hover:underline">
                📊 Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
