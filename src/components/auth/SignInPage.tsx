import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Scale, BookOpenCheck, Sparkles } from "lucide-react";

export function SignInPage() {
  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-[#00178E]/30" />
        <div className="relative z-20 flex items-center gap-2">
          {/* Logo */}
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
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Sign In</h1>
            <p className="text-sm text-muted-foreground">Enter your email to sign in</p>
          </div>
          <div className="grid gap-2">
            <Input
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
            />
            <Button>
              Continue with Email
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 