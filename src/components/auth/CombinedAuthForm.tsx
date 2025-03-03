import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Mail, 
  Lock, 
  Brain, 
  Scale, 
  BookOpenCheck, 
  Sparkles, 
  ArrowRight, 
  Stars,
  MessageSquare,
  GraduationCap,
  User,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CSSTransition } from 'react-transition-group';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface AuthFormProps {
  initialTab?: 'signin' | 'signup';
}

export function AuthForm({ initialTab = 'signin' }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, loading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Create refs for CSSTransition to avoid findDOMNode deprecation warnings
  const signInNodeRef = useRef(null);
  const signUpNodeRef = useRef(null);
  
  // Update active tab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Check if user is already authenticated
  useEffect(() => {
    if (user) {
      console.log('User already authenticated, navigating to /chat', user);
      navigate('/chat', { replace: true });
    }
  }, [user, navigate]);

  // Add a safety timeout to prevent getting stuck in loading state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (isLoading) {
      console.log('Auth loading state started, setting safety timeout');
      timeoutId = setTimeout(() => {
        console.log('Auth safety timeout triggered after 8 seconds');
        setIsLoading(false);
        toast({
          title: 'Authentication Timeout',
          description: 'The process is taking longer than expected. Please try again.',
          variant: 'destructive',
        });
      }, 8000);
    }
    
    return () => {
      if (timeoutId) {
        console.log('Clearing auth safety timeout');
        clearTimeout(timeoutId);
      }
    };
  }, [isLoading, toast]);

  // Sign in handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Sign in form submitted with email:', email);
    setIsLoading(true);

    try {
      console.log('Calling signIn with email:', email);
      const { error } = await signIn(email, password);
      console.log('SignIn response error:', error);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'You have been signed in. Redirecting to app...',
      });
      
      // Immediately navigate to chat after successful sign-in
      console.log('Sign-in successful, immediately navigating to /chat');
      navigate('/chat', { replace: true });
      
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign in. Please check your credentials and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Sign up form submitted with email:', email);
    setIsLoading(true);

    try {
      console.log('Calling signUp with email:', email);
      const { error } = await signUp(email, password);
      console.log('SignUp response error:', error);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Please check your email to verify your account.',
      });
      
      setActiveTab('signin');
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center animated-gradient p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-6xl flex flex-col md:flex-row bg-white/90 rounded-xl shadow-xl overflow-hidden">
        {/* Left Side - Branding */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-[#00178E]/10 to-[#F37022]/10 p-8 flex flex-col items-center justify-between relative overflow-hidden">
          <div className="flex flex-col items-center justify-center flex-grow py-8">
            {/* Main Brain Icon with Surrounding Icons - Hero Logo Style */}
            <div className="relative mb-8">
              <div className="relative">
                <Brain className="w-32 h-32 sm:w-40 sm:h-40 text-[#F37022]" />
                
                {/* Positioned Icons Around Brain - Similar to Hero Logo */}
                <div className="absolute -top-4 -right-4">
                  <Scale className="w-10 h-10 text-yellow-500 animate-float-slow" />
                </div>
                
                <div className="absolute -bottom-2 -left-4">
                  <BookOpenCheck className="w-10 h-10 text-purple-500 animate-float-medium" />
                </div>
                
                <div className="absolute -bottom-2 -right-4">
                  <Sparkles className="w-10 h-10 text-sky-400 animate-float-fast" />
                </div>
              </div>
            </div>
            
            {/* Ask JDS Title */}
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6">Ask JDS</h1>
            </Link>
            
            <p className="text-gray-600 text-center max-w-sm mb-8">
              Your AI-powered law school study buddy
            </p>
            
            {/* Feature Icons */}
            <div className="grid grid-cols-3 gap-6 w-full max-w-sm">
              <div className="flex flex-col items-center">
                <div className="bg-[#F37022]/10 p-3 rounded-full mb-2">
                  <MessageSquare className="w-6 h-6 text-[#F37022]" />
                </div>
                <span className="text-xs text-center">Ask Questions</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-[#00178E]/10 p-3 rounded-full mb-2">
                  <GraduationCap className="w-6 h-6 text-[#00178E]" />
                </div>
                <span className="text-xs text-center">Learn Faster</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-purple-500/10 p-3 rounded-full mb-2">
                  <BookOpenCheck className="w-6 h-6 text-purple-500" />
                </div>
                <span className="text-xs text-center">Ace Exams</span>
              </div>
            </div>
          </div>
          
          {/* JD Simplified Logo - Pinned to Bottom */}
          <div className="mt-4">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              {/* 
                TODO: Consider using a white version of the logo for better contrast
                against the gradient background. For now, we're using the original logo.
                
                Suggestion: You could use a conditional based on a theme or prop:
                {useWhiteLogo ? (
                  <img 
                    src="/images/JD Simplified Logo - Horizontal - White.svg" 
                    alt="JD Simplified Logo" 
                    className="h-10 sm:h-12" 
                  />
                ) : (
                  <img 
                    src="/images/JD Simplified Logo - Horizontal.svg" 
                    alt="JD Simplified Logo" 
                    className="h-10 sm:h-12" 
                  />
                )}
              */}
              <img 
                src="/images/JD Simplified Logo - Horizontal.svg" 
                alt="JD Simplified Logo" 
                className="h-10 sm:h-12" 
              />
            </Link>
          </div>
        </div>
        
        {/* Right Side - Auth Form */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between">
          <div className="flex-grow flex flex-col justify-center">
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="space-y-1 pb-4 text-center">
                <CardTitle className="text-xl sm:text-2xl font-bold">
                  {activeTab === 'signin' ? 'Welcome Back' : 'Create an Account'}
                </CardTitle>
                <CardDescription>
                  {activeTab === 'signin' 
                    ? 'Sign in to your account to continue' 
                    : 'Join JD Simplified to start your learning journey'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="signin" value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="signin" className="text-sm sm:text-base">Sign In</TabsTrigger>
                    <TabsTrigger value="signup" className="text-sm sm:text-base">Sign Up</TabsTrigger>
                  </TabsList>
                  
                  <div className="min-h-[320px]"> {/* Fixed height container to prevent layout shifts */}
                    <CSSTransition
                      in={activeTab === 'signin'}
                      timeout={300}
                      classNames="auth-tab-content"
                      unmountOnExit
                      nodeRef={signInNodeRef}
                    >
                      <TabsContent value="signin" className="auth-tab-content" ref={signInNodeRef}>
                        <form onSubmit={handleSignIn} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="signin-email">Email</Label>
                            <div className="relative auth-input-focus">
                              <Mail className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                              <Input
                                id="signin-email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="pl-10 h-10"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="remember" />
                                <Label htmlFor="remember" className="text-xs sm:text-sm">Remember me</Label>
                              </div>
                              <Link to="/auth/reset-password" className="text-xs sm:text-sm text-[#F37022] hover:underline">
                                Forgot password?
                              </Link>
                            </div>
                            <div className="relative auth-input-focus">
                              <Lock className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                              <Input
                                id="signin-password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="pl-10 h-10"
                              />
                            </div>
                          </div>
                          
                          <Button 
                            type="submit" 
                            className="w-full bg-[#F37022] hover:bg-[#E36012] transition-all duration-300 transform hover:scale-[1.02] pulse-on-hover h-10"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <LoadingSpinner size="sm" className="mr-2" />
                            ) : (
                              <>
                                Sign In
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </form>
                      </TabsContent>
                    </CSSTransition>
                    
                    <CSSTransition
                      in={activeTab === 'signup'}
                      timeout={300}
                      classNames="auth-tab-content"
                      unmountOnExit
                      nodeRef={signUpNodeRef}
                    >
                      <TabsContent value="signup" className="auth-tab-content" ref={signUpNodeRef}>
                        <form onSubmit={handleSignUp} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="signup-email">Email</Label>
                            <div className="relative auth-input-focus">
                              <Mail className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                              <Input
                                id="signup-email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="pl-10 h-10"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="signup-password">Password</Label>
                            <div className="relative auth-input-focus">
                              <Lock className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                              <Input
                                id="signup-password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="pl-10 h-10"
                              />
                            </div>
                            <p className="text-xs text-gray-500">
                              Password must be at least 8 characters long
                            </p>
                          </div>
                          
                          <Button 
                            type="submit" 
                            className="w-full bg-[#F37022] hover:bg-[#E36012] transition-all duration-300 transform hover:scale-[1.02] pulse-on-hover h-10"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <LoadingSpinner size="sm" className="mr-2" />
                            ) : (
                              <>
                                Create Account
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </form>
                      </TabsContent>
                    </CSSTransition>
                  </div>
                  
                  {/* OAuth Buttons - Moved closer to the form */}
                  <div className="mt-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500">Or continue with</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <Button 
                        variant="outline" 
                        className="w-full transition-all duration-300 transform hover:scale-[1.02] pulse-on-hover h-9 sm:h-10 text-xs sm:text-sm"
                      >
                        <svg className="mr-2 h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 24 24">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                          <path d="M1 1h22v22H1z" fill="none" />
                        </svg>
                        Google
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full transition-all duration-300 transform hover:scale-[1.02] pulse-on-hover h-9 sm:h-10 text-xs sm:text-sm"
                      >
                        <svg className="mr-2 h-3 w-3 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                        </svg>
                        Facebook
                      </Button>
                    </div>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>
          
          {/* Terms and Privacy - Pinned to Bottom */}
          <div className="mt-auto pt-8">
            <div className="text-center text-xs sm:text-sm text-gray-600">
              <p>By signing in or creating an account, you agree to our</p>
              <div className="mt-1 flex justify-center space-x-2">
                <Link to="/terms" className="text-[#F37022] hover:underline">Terms of Service</Link>
                <span>and</span>
                <Link to="/privacy" className="text-[#F37022] hover:underline">Privacy Policy</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 