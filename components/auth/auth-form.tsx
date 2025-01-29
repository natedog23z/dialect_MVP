'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signInAction, signUpAction } from '@/app/actions'

export default function AuthForm({ type }: { type: 'login' | 'signup' }) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: FormData) => {
    setError(null)
    setLoading(true)

    try {
      if (type === 'login') {
        await signInAction(e)
      } else {
        await signUpAction(e)
      }
      router.refresh()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="w-full space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          className="bg-[#2A2F3F] border-[#3A3F4F] text-white"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          className="bg-[#2A2F3F] border-[#3A3F4F] text-white"
        />
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <Button
        type="submit"
        className="w-full bg-[#4477FF] hover:bg-[#3366EE] text-white"
        disabled={loading}
      >
        {loading ? 'Loading...' : type === 'login' ? 'Sign in' : 'Sign up'}
      </Button>
    </form>
  )
} 
