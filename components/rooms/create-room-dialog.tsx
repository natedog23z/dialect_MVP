"use client"

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function CreateRoomDialog() {
  const [open, setOpen] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Add effect to check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      console.log('Current auth status:', { user, error })
    }
    checkAuth()
  }, [])

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomName.trim()) {
      toast.error('Please enter a room name')
      return
    }

    setIsLoading(true)
    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        throw new Error(`Failed to get user: ${userError.message}`)
      }

      if (!user) {
        throw new Error('No user found')
      }

      console.log('Attempting to create room with user:', user.id)

      // Create the room with creator_id
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert([{ 
          name: roomName.trim(),
          creator_id: user.id,
          max_participants: 12
        }])
        .select()
        .single()

      if (roomError) {
        console.error('Room creation error:', roomError)
        throw new Error(`Failed to create room: ${roomError.message}`)
      }

      if (!room) {
        throw new Error('Room was created but no data was returned')
      }

      console.log('Created room:', room)

      // Add current user as a participant
      const { error: participantError } = await supabase
        .from('room_participants')
        .insert([{ 
          room_id: room.id,
          user_id: user.id
        }])

      if (participantError) {
        console.error('Participant creation error:', participantError)
        throw new Error(`Failed to add participant: ${participantError.message}`)
      }

      toast.success('Room created successfully!')
      setOpen(false)
      setRoomName('')
      
      // Redirect to the new room
      router.push(`/room/${room.id}`)
    } catch (error) {
      console.error('Error creating room:', error instanceof Error ? error.message : error)
      toast.error(error instanceof Error ? error.message : 'Failed to create room. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="inline-flex items-center px-6 py-3 text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create a Room
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create a New Room</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a space for intimate collaboration with up to 12 participants.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateRoom}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="roomName" className="text-sm font-medium text-gray-300">
                Room Name
              </label>
              <Input
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter room name"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-gray-300 hover:text-white"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Room'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 