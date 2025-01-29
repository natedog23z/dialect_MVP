import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AuthForm from '@/components/auth/auth-form'

export default async function SignUp() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen bg-[#1a1f2e] text-white">
      <div className="m-auto max-w-md w-full px-8">
        <div className="flex flex-col items-center space-y-6">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <AuthForm type="signup" />
        </div>
      </div>
    </div>
  )
} 