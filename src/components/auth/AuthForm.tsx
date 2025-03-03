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
  Loader2, 
  Mail, 
  Lock, 
  Brain, 
  Scale, 
  BookOpenCheck, 
  Sparkles, 
  ArrowRight, 
  Stars,
  MessageSquare,
  GraduationCap
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CSSTransition } from 'react-transition-group';

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
                <CardTitle className="text-2xl font-bold">
                  {activeTab === 'signin' ? 'Welcome Back' : 'Create an Account'}
                </CardTitle>
                <CardDescription>
                  {activeTab === 'signin' 
                    ? 'Enter your credentials to sign in to your account' 
                    : 'Enter your information to create an account'}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <Tabs 
                  defaultValue={activeTab} 
                  value={activeTab} 
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>
                  
                  <CSSTransition
                    in={activeTab === 'signin'}
                    timeout={300}
                    classNames="fade"
                    unmountOnExit
                    nodeRef={signInNodeRef}
                  >
                    <TabsContent value="signin" ref={signInNodeRef}>
                      <form onSubmit={handleSignIn} className="space-y-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="signin-email">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                id="signin-email"
                                placeholder="name@example.com"
                                type="email"
                                autoCapitalize="none"
                                autoComplete="email"
                                autoCorrect="off"
                                disabled={isLoading}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10"
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="signin-password">Password</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                id="signin-password"
                                placeholder="••••••••"
                                type="password"
                                autoCapitalize="none"
                                autoComplete="current-password"
                                autoCorrect="off"
                                disabled={isLoading}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10"
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="remember" />
                              <Label htmlFor="remember" className="text-xs sm:text-sm">Remember me</Label>
                            </div>
                            <Link to="/auth/reset-password" className="text-xs sm:text-sm text-[#F37022] hover:underline">
                              Forgot password?
                            </Link>
                          </div>
                          
                          <Button 
                            type="submit" 
                            className="w-full bg-[#F37022] hover:bg-[#E36012]"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Signing In...
                              </>
                            ) : (
                              <>
                                Sign In
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </TabsContent>
                  </CSSTransition>
                  
                  <CSSTransition
                    in={activeTab === 'signup'}
                    timeout={300}
                    classNames="fade"
                    unmountOnExit
                    nodeRef={signUpNodeRef}
                  >
                    <TabsContent value="signup" ref={signUpNodeRef}>
                      <form onSubmit={handleSignUp} className="space-y-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="signup-email">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                id="signup-email"
                                placeholder="name@example.com"
                                type="email"
                                autoCapitalize="none"
                                autoComplete="email"
                                autoCorrect="off"
                                disabled={isLoading}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10"
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="signup-password">Password</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                id="signup-password"
                                placeholder="••••••••"
                                type="password"
                                autoCapitalize="none"
                                autoComplete="new-password"
                                autoCorrect="off"
                                disabled={isLoading}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10"
                                required
                                minLength={8}
                              />
                            </div>
                            <p className="text-xs text-gray-500">
                              Password must be at least 8 characters long
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox id="terms" required />
                            <label
                              htmlFor="terms"
                              className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              I agree to the{" "}
                              <Link to="/terms" className="text-[#F37022] hover:underline">
                                Terms of Service
                              </Link>{" "}
                              and{" "}
                              <Link to="/privacy" className="text-[#F37022] hover:underline">
                                Privacy Policy
                              </Link>
                            </label>
                          </div>
                          
                          <Button 
                            type="submit" 
                            className="w-full bg-[#F37022] hover:bg-[#E36012]"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating Account...
                              </>
                            ) : (
                              <>
                                Create Account
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </TabsContent>
                  </CSSTransition>
                </Tabs>
              </CardContent>
              
              <CardFooter className="flex flex-col items-center justify-center pt-0">
                <div className="text-center text-sm text-gray-500 mt-4">
                  {activeTab === 'signin' ? (
                    <p>
                      Don't have an account?{' '}
                      <button 
                        type="button"
                        onClick={() => setActiveTab('signup')}
                        className="text-[#F37022] hover:underline font-medium"
                      >
                        Sign up
                      </button>
                    </p>
                  ) : (
                    <p>
                      Already have an account?{' '}
                      <button 
                        type="button"
                        onClick={() => setActiveTab('signin')}
                        className="text-[#F37022] hover:underline font-medium"
                      >
                        Sign in
                      </button>
                    </p>
                  )}
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 