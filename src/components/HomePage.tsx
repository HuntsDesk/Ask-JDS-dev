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
  Settings,
  CheckCircle
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
import { OptimizedImage } from '@/components/ui/optimized-image';

// Define the benefits array
const benefits = [
  {
    icon: Shield,
    title: "No Judgment Zone",
    description: "We won't ask why you're learning Crim Pro at 2 AM.",
    color: "text-orange-500",
    gradient: "from-orange-500/20 to-orange-500/5"
  },
  {
    icon: Zap,
    title: "Fast & Accurate",
    description: "Like that one student who always had the perfect cold-call answer.",
    color: "text-blue-500",
    gradient: "from-blue-500/20 to-blue-500/5"
  },
  {
    icon: GraduationCap,
    title: "Trained on Real Law Student Resources",
    description: "Because bar exam prep shouldn't feel like deciphering the Rosetta Stone.",
    color: "text-green-500",
    gradient: "from-green-500/20 to-green-500/5"
  },
  {
    icon: PiggyBank,
    title: "Only $5/Month",
    description: '$5 dolla make you holla (because law school is already expensive enough).',
    color: "text-purple-500",
    gradient: "from-purple-500/20 to-purple-500/5"
  }
];

// Define the questions array
const questions = [
  {
    icon: Lightbulb,
    text: "Explain promissory estoppel like I'm five.",
    category: "Concept Clarification",
    color: "text-orange-500",
    bgColor: "bg-orange-500/5"
  },
  {
    icon: HelpCircle,
    text: "What's the difference between negligence and strict liability?",
    category: "Legal Distinctions",
    color: "text-blue-500",
    bgColor: "bg-blue-500/5"
  },
  {
    icon: MessagesSquare,
    text: "Does this outline make sense, or have I completely lost my mind?",
    category: "Study Review",
    color: "text-green-500",
    bgColor: "bg-green-500/5"
  },
  {
    icon: Coffee,
    text: "If I drop out now, how much debt will haunt me? (Just kidding… kinda.)",
    category: "Life Advice",
    color: "text-purple-500",
    bgColor: "bg-purple-500/5"
  }
];

export function HomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const checkSubscription = async () => {
      if (user) {
        try {
          const hasActiveSubResult = await hasActiveSubscription(user.id);
          if (isMounted) {
            setHasSubscription(hasActiveSubResult);
          }
        } catch (error) {
          console.error("Error checking subscription:", error);
        }
      }
    };

    // Check subscription if user exists
    if (user) {
      checkSubscription();
    }
    
    return () => {
      isMounted = false;
    };
  }, [user]);

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
  
  if (loading) {
    return <LoadingSpinner fullScreen />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Top Menu */}
      <nav className="fixed top-0 left-0 right-0 bg-white z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <OptimizedImage 
                src="/images/JDSimplified_Logo.png" 
                alt="JD Simplified Logo" 
                className="h-12" 
                priority={true}
              />
            </Link>
          </div>

          {/* Navigation Links | Header | Top Menu */}
          <div className="flex items-center">
            {user ? (
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
              <div className="flex items-center gap-4">
                <Button 
                  onClick={() => navigate('/auth')}
                  className="text-gray-600 hover:text-[#F37022] transition-colors"
                  variant="ghost"
                >
                  Login
                </Button>
                <Button 
                  onClick={() => navigate('/auth?tab=signup')}
                  className="bg-[#F37022] hover:bg-[#E35D10] text-white"
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-b from-gray-50 to-white animated-gradient">
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
              Welcome to Ask JDS, where you can throw your burning law school and bar prep questions at a friendly AI Law Nerd who won't shame you for forgetting the rule against perpetuities (again).
            </p>

            <div className="flex flex-col md:flex-row gap-4 mt-8 justify-center">
              {user ? (
                <button 
                  onClick={() => navigate('/chat')}
                  className="bg-[#F37022] hover:bg-[#E35D10] text-white font-medium py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  Start Chatting
                </button>
              ) : (
                <Link 
                  to="/auth"
                  className="bg-[#F37022] hover:bg-[#E35D10] text-white font-medium py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Rocket className="w-5 h-5" />
                  Sign Up
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-b from-[#00178E]/5 to-[#00178E]/5">
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
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white"></div>
        <div className="max-w-6xl mx-auto px-4 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-black mb-4">Why Use Ask JDS?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Your personal legal study companion that's always ready to help, without the hefty price tag.
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
                    <h3 className="text-2xl font-semibold text-[#00178E] mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-lg text-gray-600 group-hover:text-gray-700 transition-colors">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
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
                  <div className={`${question.color} bg-white p-2 rounded-md`}>
                    <question.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className={`text-2xl font-semibold ${question.color} mb-2 block`}>
                      {question.category}
                    </span>
                    <p className="text-lg text-gray-600 group-hover:text-gray-700 transition-colors">
                      {question.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-black">Simple, Transparent Pricing</h2>
          <p className="text-lg text-gray-600 mt-2">
            Ask JDS. Smarter than your group chat, cheaper than a tutor.
          </p>
        </div>
        <div className="mt-12 flex flex-col md:flex-row justify-center gap-8 max-w-5xl mx-auto">
          {[
            {
              title: "Basic",
              price: "$0",
              tagline: "FREE FOREVER",
              features: [
                "5 Messages Per Day",
                "Basic Legal Concepts",
                "Standard Response Time",
              ],
              buttonText: "Try For Free",
              buttonVariant: "outline",
              highlight: false,
            },
            {
              title: "Premium",
              price: "$5",
              tagline: "MOST POPULAR",
              features: [
                "Unlimited Messages",
                "Advanced Legal Concepts",
                "Priority Response Time",
                "Exam Prep & Case Analysis",
              ],
              buttonText: "Get Premium Access",
              buttonVariant: "primary",
              highlight: true,
            },
          ].map((plan, index) => (
            <div
              key={index}
              className={`relative flex flex-col p-6 rounded-lg shadow-lg w-full md:w-1/2 transition-transform hover:scale-105
                ${plan.highlight ? "bg-orange-100 border-2 border-orange-500" : "bg-white"}
              `}
            >
              {plan.highlight && (
                <div className="absolute top-4 right-4 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {plan.tagline}
                </div>
              )}
              <h3 className="text-2xl font-semibold text-gray-900">{plan.title}</h3>
              <p className="text-5xl font-bold text-black mt-2">{plan.price}
                <span className="text-lg font-medium text-gray-600">/month</span>
              </p>
              <ul className="mt-4 space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="text-green-500 w-5 h-5" /> {feature}
                  </li>
                ))}
              </ul>
              {user ? (
                plan.title === "Basic" ? (
                  <Button
                    onClick={() => navigate('/chat')}
                    className={`mt-6 w-full ${plan.highlight ? "bg-orange-500 hover:bg-orange-600 text-white" : "border-gray-400 hover:bg-gray-100"}`}
                  >
                    Start Chatting
                  </Button>
                ) : (
                  hasSubscription ? (
                    <Button
                      onClick={() => navigate('/chat')}
                      className="mt-6 w-full bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      Start Chatting
                    </Button>
                  ) : (
                    <Button
                      onClick={() => navigate('/settings')}
                      className="mt-6 w-full bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      Upgrade Now
                    </Button>
                  )
                )
              ) : (
                <Button
                  onClick={() => navigate('/auth?tab=signup')}
                  className={`mt-6 w-full ${plan.highlight ? "bg-orange-500 hover:bg-orange-600 text-white" : "border-gray-400 hover:bg-gray-100"}`}
                >
                  {plan.buttonText}
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#00178E]/5 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-5xl font-bold text-[#00178E] mb-6">
            {user ? (hasSubscription ? "You're All Set!" : "Upgrade Your Experience") : "Sign Up Now"}
          </h2>
          <p className="text-2xl text-[#00178E] mb-10">
            {hasSubscription 
              ? "You're all set with your premium subscription! Head to the chat to start asking questions."
              : "Skip the overpriced tutors and questionable Reddit advice—Ask JDS is your $5/month legal survival guide."}
          </p>
          <div className="flex flex-col items-center gap-8">
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              {user ? (
                <button 
                  onClick={() => navigate('/chat')}
                  className="bg-[#F37022] hover:bg-[#E35D10] text-white font-medium py-4 px-8 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-xl"
                >
                  <MessageSquare className="w-6 h-6" />
                  Start Chatting
                </button>
              ) : (
                <Link 
                  to="/auth"
                  className="bg-[#F37022] hover:bg-[#E35D10] text-white font-medium py-4 px-8 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-xl"
                >
                  <Rocket className="w-6 h-6" />
                  Sign Up
                </Link>
              )}
            </div>
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
                <OptimizedImage 
                  src="/images/JDSimplified_Logo_wht.png" 
                  alt="JD Simplified Logo" 
                  className="h-12" 
                />
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
                  <Link to="/auth" className="text-gray-300 hover:text-white transition-colors">Sign In</Link>
                </li>
                <li>
                  <Link to="/auth?tab=signup" className="text-gray-300 hover:text-white transition-colors">Sign Up</Link>
                </li>
                {user && (
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
              &copy; {new Date().getFullYear()} JD Simplified, LLC. All rights reserved.
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