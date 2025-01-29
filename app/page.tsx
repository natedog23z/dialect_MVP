import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#1a1f2e] text-white w-full">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
        <div className="text-2xl font-bold">Dialect</div>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-white hover:text-white/80">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-[#4477FF] hover:bg-[#3366EE] text-white">
              Sign up
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto text-center px-8 flex flex-col items-center">
        <div className="max-w-4xl mx-auto pt-20">
          <h1 className="text-7xl font-bold mb-6 tracking-tight">
            Where Small Teams
            <br />
            <span className="text-[#4477FF] mt-2 block">Think Bigger</span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            AI-powered group chat that turns conversations into insights. Collaborate in real-time, share content, and let AI enhance your team's creativity.
          </p>

          <Link href="/signup">
            <Button className="bg-[#4477FF] hover:bg-[#3366EE] text-white px-8 py-6 text-lg rounded-md">
              Sign Up
            </Button>
          </Link>

          <p className="text-sm text-gray-400 mt-4">
            No credit card required. Get started in minutes.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-32 w-full">
          {/* Feature 1 */}
          <div className="bg-[#1E2433] p-8 rounded-lg text-left">
            <div className="w-12 h-12 bg-[#2A2F3F] rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#4477FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-3">Real-time Collaboration</h2>
            <p className="text-gray-400 text-lg">Intimate spaces for up to 12 people to think, share, and create together.</p>
          </div>

          {/* Feature 2 */}
          <div className="bg-[#1E2433] p-8 rounded-lg text-left">
            <div className="w-12 h-12 bg-[#2A2F3F] rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#4477FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-3">Context-Aware AI</h2>
            <p className="text-gray-400 text-lg">Smart suggestions and insights that enhance your team's natural flow.</p>
          </div>

          {/* Feature 3 */}
          <div className="bg-[#1E2433] p-8 rounded-lg text-left">
            <div className="w-12 h-12 bg-[#2A2F3F] rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#4477FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-3">Seamless Content Sharing</h2>
            <p className="text-gray-400 text-lg">Share links and files with instant AI-powered analysis and insights.</p>
          </div>

          {/* Feature 4 */}
          <div className="bg-[#1E2433] p-8 rounded-lg text-left">
            <div className="w-12 h-12 bg-[#2A2F3F] rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#4477FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-3">Privacy-First Design</h2>
            <p className="text-gray-400 text-lg">Secure, encrypted spaces for your team's most important conversations.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
