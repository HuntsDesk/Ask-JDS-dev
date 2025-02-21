import { Button } from "@/components/ui/button"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useState } from "react"
import { Tabs } from "@/components/ui/tabs"
import { Scale, BookOpenCheck, Sparkles, Brain } from "lucide-react"

export function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  const [mode, setMode] = useState<'signin' | 'signup'>(() => {
    const savedMode = localStorage.getItem('authMode');
    if (savedMode === 'signup') {
      localStorage.removeItem('authMode'); // Clear it after reading
      return 'signup';
    }
    return 'signin';
  });

  const handleSubmit = () => {
    // Implement the submit logic here
  }

  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-[#00178E]/30" />
        <div className="relative z-20 flex items-center gap-2">
          <div className="relative w-10 h-10">
            <div className="absolute -top-2 -right-2 animate-float-delayed z-0">
              <Scale className="w-4 h-4 text-yellow-500 opacity-60" />
            </div>
            <div className="absolute -bottom-1 -left-2 animate-float z-0">
              <BookOpenCheck className="w-4 h-4 text-purple-500 opacity-70" />
            </div>
            <div className="absolute -bottom-2 -right-1 z-0">
              <Sparkles className="w-3 h-3 text-sky-400 animate-pulse" />
            </div>
            <div className="absolute top-0 left-0 animate-float-slow z-10">
              <Brain className="w-10 h-10 text-[#F37022]" />
            </div>
          </div>
          <span className="text-2xl font-bold text-white">Ask JDS</span>
        </div>
      </div>

      <div className="...">
        <Tabs
          defaultValue={mode}
          className="w-full"
          onValueChange={(value) => setMode(value as 'signin' | 'signup')}
        >
          <Button 
            onClick={handleSubmit}
            className="w-full bg-[#F37022] hover:bg-[#F37022]/90 text-white"
          >
            {mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </Button>
        </Tabs>
      </div>
    </div>
  )
} 