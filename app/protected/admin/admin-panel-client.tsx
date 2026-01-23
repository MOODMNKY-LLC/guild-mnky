'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Settings2 } from 'lucide-react'
import SupabaseManagerDialog from '@/components/index'

export function AdminPanelClient({ projectRef }: { projectRef: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        size="lg"
        className="w-full sm:w-auto"
      >
        <Settings2 className="mr-2 h-4 w-4" />
        Open Platform Kit
      </Button>
      <SupabaseManagerDialog
        projectRef={projectRef}
        open={isOpen}
        onOpenChange={setIsOpen}
        isMobile={isMobile}
      />
    </>
  )
}
