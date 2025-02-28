import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Brain,
  MessageSquare,
  Rocket,
  ArrowRight,
  Sparkles,
  Scale,
  BookOpenCheck,
  Shield,
  Zap,
  GraduationCap,
  PiggyBank,
  MessagesSquare,
  Lightbulb,
  HelpCircle,
  Coffee,
  User,
  Settings
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/lib/supabase';
import { FREE_MESSAGE_LIMIT } from '@/lib/subscription';
import { hasActiveSubscription } from '@/lib/subscription';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Define the benefits array
const benefits = [
  {
    title: "24/7 Legal Study Companion",
    description: "Get answers to your legal questions anytime, anywhere, without scheduling or waiting for office hours.",
    icon: Brain,
    color: "bg-blue-100",
    gradient: "from-blue-50 to-blue-100"
  },
  {
    title: "Simplified Explanations",
    description: "Complex legal concepts broken down into clear, understandable language that actually makes sense.",
    icon: Lightbulb,
    color: "bg-yellow-100",
    gradient: "from-yellow-50 to-yellow-100"
  },
  {
    title: "Exam Preparation",
    description: "Practice with targeted questions and get feedback to help you prepare for exams and the bar.",
    icon: GraduationCap,
    color: "bg-green-100",
    gradient: "from-green-50 to-green-100"
  },
  {
    title: "Case Law Analysis",
    description: "Get help understanding important cases and their implications for different areas of law.",
    icon: Scale,
    color: "bg-purple-100",
    gradient: "from-purple-50 to-purple-100"
  },
  {
    title: "Affordable Learning",
    description: "Premium legal education resources at a fraction of the cost of traditional tutoring or supplements.",
    icon: PiggyBank,
    color: "bg-pink-100",
    gradient: "from-pink-50 to-pink-100"
  },
  {
    title: "Judgment-Free Zone",
    description: "Ask any question, no matter how basic, without fear of looking unprepared in front of professors or peers.",
    icon: Shield,
    color: "bg-indigo-100",
    gradient: "from-indigo-50 to-indigo-100"
  }
];

// Define the questions array
const questions = [
  {
    text: "What's the difference between negligence and gross negligence?",
    category: "Torts",
    icon: Scale,
    color: "bg-blue-100",
    bgColor: "bg-blue-50"
  },
  {
    text: "Can you explain the Rule Against Perpetuities?",
    category: "Property Law",
    icon: BookOpenCheck,
    color: "bg-green-100",
    bgColor: "bg-green-50"
  },
  {
    text: "How do I analyze a contract formation issue?",
    category: "Contracts",
    icon: MessagesSquare,
    color: "bg-yellow-100",
    bgColor: "bg-yellow-50"
  },
  {
    text: "What are the elements of a valid will?",
    category: "Wills & Trusts",
    icon: Shield,
    color: "bg-purple-100",
    bgColor: "bg-purple-50"
  },
  {
    text: "How does the Commerce Clause affect state regulations?",
    category: "Constitutional Law",
    icon: Scale,
    color: "bg-red-100",
    bgColor: "bg-red-50"
  },
  {
    text: "What's the difference between murder and manslaughter?",
    category: "Criminal Law",
    icon: Shield,
    color: "bg-indigo-100",
    bgColor: "bg-indigo-50"
  },
  {
    text: "How do I brief a case effectively?",
    category: "Legal Research & Writing",
    icon: BookOpenCheck,
    color: "bg-pink-100",
    bgColor: "bg-pink-50"
  },
  {
    text: "What are the best strategies for the bar exam MBE section?",
    category: "Bar Exam Prep",
    icon: GraduationCap,
    color: "bg-orange-100",
    bgColor: "bg-orange-50"
  }
];

export function HomePage() {
  const navigate = useNavigate();
  const { user, loading, authInitialized, signOut } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  
  // Update authentication state when user or loading changes
  useEffect(() => {
    console.log('HomePage: Auth state', { user: user?.email, loading, authInitialized });
    
    // Only update auth state if we have definitive information
    if (!loading || authInitialized) {
      const authenticated = !!user;
      setIsAuthenticated(authenticated);
      console.log("Authentication state updated:", authenticated, "User:", user?.email);
      
      // Debug: Log the current auth state
      if (authenticated) {
        console.log("User is authenticated:", user?.email, user);
        
        // Check subscription status
        const checkSubscription = async () => {
          const subscribed = await hasActiveSubscription(user.id);
          setIsSubscribed(subscribed);
        };
        
        checkSubscription();
      } else {
        console.log("User is not authenticated");
        setIsSubscribed(false);
      }
    }
  }, [user, loading, authInitialized]);
  
  // Redirect to chat if user is already authenticated and visits the sign-in page
  useEffect(() => {
    const currentPath = window.location.pathname;
    if ((currentPath === '/auth/signin' || currentPath === '/auth/combined') && isAuthenticated) {
      console.log('User is already signed in, redirecting to chat from path:', currentPath);
      navigate('/chat', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Force re-check auth state when component mounts, but don't block rendering
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          console.log("Session found on homepage mount:", data.session.user.email);
        } else {
          console.log("No session found on homepage mount");
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };
    
    // Check auth in the background without blocking rendering
    setTimeout(checkAuth, 0);
  }, []);

  const handleSignOut = async () => {
    console.log('HomePage: Sign out button clicked');
    try {
      await signOut();
      // Force a page reload to clear any stale state
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      // Force a page reload as a fallback
      window.location.href = '/';
    }
  };
  
  // Always render the homepage content immediately
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Top Menu */}
      <nav className="fixed top-0 left-0 right-0 bg-white z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link to="/">
              <img 
                src="/images/JD Simplified Logo - Horizontal.svg" 
                alt="JD Simplified Logo" 
                className="h-10 hover:opacity-80 transition-opacity" 
              />
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/chat')}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Chat</span>
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-full w-10 h-10 p-0">
                      <User className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      {user?.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/auth/combined')}
                >
                  Sign In
                </Button>
                <Button 
                  onClick={() => navigate('/auth/combined?tab=signup')}
                  className="bg-[#F37022] hover:bg-[#E36012]"
                >
                  Sign Up
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/auth/combined')}
                  className="ml-2 border-[#F37022] text-[#F37022] hover:bg-[#F37022]/10"
                >
                  New Auth
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4">
          {/* Hero Logo Section - Larger, vertically stacked */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="relative w-32 h-32 mb-3">
              <div className="absolute -top-4 -right-4 animate-float-delayed z-0">
                <Scale className="w-12 h-12 text-yellow-500 opacity-60" />
              </div>
              <div className="absolute -bottom-3 -left-4 animate-float z-0">
                <BookOpenCheck className="w-12 h-12 text-purple-500 opacity-70" />
              </div>
              <div className="absolute -bottom-4 -right-3 z-0">
                <Sparkles className="w-10 h-10 text-sky-400 animate-pulse" />
              </div>
              <div className="absolute top-0 left-0 animate-float-slow z-10">
                <Brain className="w-32 h-32 text-[#F37022]" />
              </div>
            </div>
            <span className="text-5xl font-bold text-black">Ask JDS</span>
          </div>

          {/* Hero Content */}
          <div className="text-center mt-16">
            <h1 className="text-5xl font-bold text-black mb-8">
              The <i className="text-[#F37022]">Law Study Buddy</i> that won't judge you for procrastinating.
            </h1>

            <h2 className="text-3xl font-bold text-black mb-4">
              Struggling with law school or the bar exam?
            </h2>

            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Welcome to Ask JDS by JD Simplified, where you can throw your burning law school and bar prep questions at a friendly AI Law Nerd who won't shame you for forgetting the rule against perpetuities (again).
            </p>

            {isAuthenticated ? (
              <button 
                onClick={() => navigate('/chat')}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-[#F37022] rounded-full overflow-hidden shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <span className="relative">Go to Chat</span>
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            ) : (
              <button 
                onClick={() => navigate('/auth/combined?tab=signup')}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-[#F37022] rounded-full overflow-hidden shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <span className="relative">Get Started for $5/Month</span>
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-[#00178E]/30">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16 text-black">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <MessageSquare className="w-12 h-12 text-[#00178E] mb-4" />
              <h3 className="text-xl font-semibold mb-4 text-[#F37022]">Ask a Question</h3>
              <p className="text-gray-600">Type in your legal query. Bar prep, case law, general despair—it's all fair game.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <Brain className="w-12 h-12 text-[#00178E] mb-4" />
              <h3 className="text-xl font-semibold mb-4 text-[#F37022]">Get an Answer</h3>
              <p className="text-gray-600">Powered by legal outlines, case summaries, and the AI equivalent of an over-caffeinated 3L.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <Rocket className="w-12 h-12 text-[#00178E] mb-4" />
              <h3 className="text-xl font-semibold mb-4 text-[#F37022]">Pass Your Exam</h3>
              <p className="text-gray-600">We can't guarantee an A, but we can make sure you at least sound like you know what you're talking about.</p>
            </div>
          </div>
          
          {/* CTA Button */}
          <div className="flex justify-center mt-12">
            {isAuthenticated ? (
              <Button 
                onClick={() => navigate('/chat')}
                className="bg-[#00178E] hover:bg-[#001070] text-white px-8 py-6 text-lg rounded-lg flex items-center gap-2 transform hover:-translate-y-1 transition-all duration-300"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Start Chatting Now</span>
                <ArrowRight className="ml-1 w-5 h-5" />
              </Button>
            ) : (
              <Button 
                onClick={() => navigate('/auth/combined?tab=signup')}
                className="bg-[#00178E] hover:bg-[#001070] text-white px-8 py-6 text-lg rounded-lg flex items-center gap-2 transform hover:-translate-y-1 transition-all duration-300"
              >
                <Rocket className="w-5 h-5" />
                <span>Try It Free</span>
                <ArrowRight className="ml-1 w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white"></div>
        <div className="max-w-6xl mx-auto px-4 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-black mb-4">Why Use Ask JDS?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Your personal legal study companion from JD Simplified that's always ready to help, without the hefty price tag.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                
                <div className="relative flex items-start space-x-6">
                  <div className={`${benefit.color} p-3 rounded-lg`}>
                    <benefit.icon className="w-10 h-10" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-[#00178E] mb-2">
                      {benefit.title}
                    </p>
                    <p className="text-lg text-gray-600 group-hover:text-gray-700 transition-colors">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* CTA Button */}
          <div className="flex justify-center mt-12">
            {isAuthenticated ? (
              <Button 
                onClick={() => navigate('/chat')}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-6 text-lg rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <GraduationCap className="w-5 h-5" />
                <span>Start Learning Smarter</span>
                <ArrowRight className="ml-1 w-5 h-5" />
              </Button>
            ) : (
              <Button 
                onClick={() => navigate('/auth/combined?tab=signup')}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-6 text-lg rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <GraduationCap className="w-5 h-5" />
                <span>Upgrade Your Study Game</span>
                <ArrowRight className="ml-1 w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Example Questions */}
      <section className="py-20 bg-[#00178E]/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-black mb-4">What Can You Ask?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From basic concepts to existential crises, we've got you covered.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {questions.map((question, index) => (
              <div 
                key={index} 
                className={`${question.bgColor} p-6 rounded-xl transition-all duration-300 hover:shadow-lg group`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`${question.color} p-3 rounded-lg`}>
                    <question.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-[#00178E] mb-2">
                      {question.text}
                    </p>
                    <p className="text-sm text-gray-600">
                      {question.category}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* CTA Button */}
          <div className="flex justify-center mt-12">
            {isAuthenticated ? (
              <Button 
                onClick={() => navigate('/chat')}
                className="bg-[#F37022] hover:bg-[#E36012] text-white px-8 py-6 text-lg rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Ask Your Own Questions</span>
                <ArrowRight className="ml-1 w-5 h-5" />
              </Button>
            ) : (
              <Button 
                onClick={() => navigate('/auth/combined?tab=signup')}
                className="bg-[#F37022] hover:bg-[#E36012] text-white px-8 py-6 text-lg rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Ask Your First Question</span>
                <ArrowRight className="ml-1 w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-black mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              No complicated tiers. No hidden fees. Just straightforward pricing to help you ace your classes.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 transition-all duration-300 hover:shadow-xl">
              <div className="p-8">
                <h3 className="text-2xl font-bold text-[#00178E] mb-4">Free Trial</h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold">$0</span>
                </div>
                <p className="text-gray-600 mb-6">Get started with a limited number of questions.</p>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>{FREE_MESSAGE_LIMIT} questions per month</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Basic legal concept explanations</span>
                  </li>
                  <li className="flex items-center text-gray-400">
                    <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <span>Unlimited questions</span>
                  </li>
                  <li className="flex items-center text-gray-400">
                    <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <span>Advanced case analysis</span>
                  </li>
                  <li className="flex items-center text-gray-400">
                    <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <span>Exam preparation assistance</span>
                  </li>
                </ul>
                
                {isAuthenticated ? (
                  <Button 
                    onClick={() => navigate('/chat')}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg"
                  >
                    Start Chatting
                  </Button>
                ) : (
                  <Button 
                    onClick={() => navigate('/auth/combined?tab=signup')}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg"
                  >
                    Sign Up Free
                  </Button>
                )}
              </div>
            </div>
            
            {/* Premium Plan */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden border-2 border-[#F37022] transition-all duration-300 hover:shadow-xl relative">
              {/* Popular Badge */}
              <div className="absolute top-0 right-0 bg-[#F37022] text-white px-4 py-1 rounded-bl-lg font-semibold">
                MOST POPULAR
              </div>
              
              <div className="p-8">
                <h3 className="text-2xl font-bold text-[#00178E] mb-4">Premium</h3>
                <div className="mb-4 flex items-end">
                  <span className="text-5xl font-bold">$5</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
                <p className="text-gray-600 mb-6">Everything you need to succeed in law school.</p>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Unlimited questions</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Advanced legal concept explanations</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Detailed case analysis</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Exam preparation assistance</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Cancel anytime</span>
                  </li>
                </ul>
                
                {isAuthenticated ? (
                  isSubscribed ? (
                    <Button 
                      onClick={() => navigate('/chat')}
                      className="w-full bg-[#F37022] hover:bg-[#E36012] text-white py-3 rounded-lg"
                    >
                      Go to Chat
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => navigate('/settings')}
                      className="w-full bg-[#F37022] hover:bg-[#E36012] text-white py-3 rounded-lg"
                    >
                      Upgrade Now
                    </Button>
                  )
                ) : (
                  <Button 
                    onClick={() => navigate('/auth/combined?tab=signup')}
                    className="w-full bg-[#F37022] hover:bg-[#E36012] text-white py-3 rounded-lg"
                  >
                    Get Started
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Money Back Guarantee */}
          <div className="text-center mt-12">
            <p className="text-gray-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
              <span>7-day money-back guarantee. No questions asked.</span>
            </p>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-[#00178E] text-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo and Description */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Link to="/">
                  <img 
                    src="/images/JD Simplified Logo - Horizontal.svg" 
                    alt="JD Simplified Logo" 
                    className="h-10 invert hover:opacity-80 transition-opacity" 
                  />
                </Link>
              </div>
              <p className="text-gray-300 mb-4">
                Your AI-powered law school study companion that helps you understand complex legal concepts, prepare for exams, and boost your confidence.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="text-gray-300 hover:text-white transition-colors">Home</Link>
                </li>
                <li>
                  <Link to="/auth/combined" className="text-gray-300 hover:text-white transition-colors">Sign In</Link>
                </li>
                <li>
                  <Link to="/auth/combined?tab=signup" className="text-gray-300 hover:text-white transition-colors">Sign Up</Link>
                </li>
                <li>
                  <Link to="/auth/combined" className="text-gray-300 hover:text-white transition-colors">New Auth Page</Link>
                </li>
                {isAuthenticated && (
                  <>
                    <li>
                      <Link to="/chat" className="text-gray-300 hover:text-white transition-colors">Chat</Link>
                    </li>
                    <li>
                      <Link to="/settings" className="text-gray-300 hover:text-white transition-colors">Settings</Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
            
            {/* Legal */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors">Terms of Service</a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors">Privacy Policy</a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors">Cookie Policy</a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors">Disclaimer</a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-blue-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-300 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} JD Simplified. All rights reserved.
            </p>
            <p className="text-gray-300 text-sm">
              Made with ❤️ for law students everywhere
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}