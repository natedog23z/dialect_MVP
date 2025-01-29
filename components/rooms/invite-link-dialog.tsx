"use client"

import { useState } from 'react'
import { Link2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

interface InviteLinkDialogProps {
  roomId: string
}

export function InviteLinkDialog({ roomId }: InviteLinkDialogProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Generate the invite link using the current origin
  const getInviteLink = () => {
    const origin = window.location.origin
    return `${origin}/room/join/${roomId}`
  }

  const handleCopyLink = async () => {
    const link = getInviteLink()
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy link')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 bg-[#2A2F3F] text-white hover:bg-[#3A3F4F] hover:text-[#4477FF] border-[#4477FF]/20"
        >
          <Link2 className="h-4 w-4" />
          Invite People
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-[#1E2538] border border-[#4477FF]/20">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Invite to Room</DialogTitle>
          <DialogDescription className="text-gray-400">
            Share this link with others to invite them to join the collaboration.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                readOnly
                value={getInviteLink()}
                className="pr-10 bg-[#2A2F3F] border-[#4477FF]/20 text-white focus:border-[#4477FF] focus:ring-1 focus:ring-[#4477FF]"
              />
            </div>
            <Button
              onClick={handleCopyLink}
              className="bg-[#4477FF] text-white hover:bg-[#3366EE] transition-colors min-w-[100px]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-white hover:bg-[#2A2F3F]"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 