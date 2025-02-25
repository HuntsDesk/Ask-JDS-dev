import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  Coffee
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { LoadingSpinner } from './LoadingSpinner';
import { Button } from '@/components/ui/button';

export function HomePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  const benefits = [
    {
      icon: Shield,
      title: "No Judgment Zone",
      description: "We won&apos;t ask why you&apos;re learning Crim Pro at 2 AM.",
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
      description: "Because bar exam prep shouldn&apos;t feel like deciphering the Rosetta Stone.",
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

  const questions = [
    {
      icon: Lightbulb,
      text: "Explain promissory estoppel like I&apos;m five.",
      category: "Concept Clarification",
      color: "text-orange-500",
      bgColor: "bg-orange-500/5"
    },
    {
      icon: HelpCircle,
      text: "What&apos;s the difference between negligence and strict liability?",
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
            <div className="relative w-10 h-10">
              {/* Small icons - lower z-index */}
              <div className="absolute -top-2 -right-2 animate-float-delayed z-0">
                <Scale className="w-4 h-4 text-yellow-500 opacity-60" />
              </div>
              <div className="absolute -bottom-1 -left-2 animate-float z-0">
                <BookOpenCheck className="w-4 h-4 text-purple-500 opacity-70" />
              </div>
              <div className="absolute -bottom-2 -right-1 z-0">
                <Sparkles className="w-3 h-3 text-sky-400 animate-pulse" />
              </div>
              {/* Main brain icon - brand orange */}
              <div className="absolute top-0 left-0 animate-float-slow z-10">
                <Brain className="w-10 h-10 text-[#F37022]" />
              </div>
            </div>
            <span className="text-2xl font-bold text-black">Ask JDS</span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center">
            {user ? (
              <Button onClick={() => navigate('/chat')}>
                Go to Chat
              </Button>
            ) : (
              <Button onClick={() => navigate('/auth/signin')}>
                Sign In
              </Button>
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
              The <i className="text-[#F37022]">Law Study Buddy</i> that won&apos;t judge you for procrastinating.
            </h1>

            <h2 className="text-3xl font-bold text-black mb-4">
              Struggling with law school or the bar exam?
            </h2>

            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Welcome to Ask JDS, where you can throw your burning law school and bar prep questions at a friendly AI Law Nerd who won&apos;t shame you for forgetting the rule against perpetuities (again).
            </p>

            <button 
              onClick={() => navigate('/auth/signup')}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-[#F37022] rounded-full overflow-hidden shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <span className="relative">Get Started for $5/Month</span>
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
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
              <p className="text-gray-600">Type in your legal query. Bar prep, case law, general despair—it&apos;s all fair game.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <Brain className="w-12 h-12 text-[#00178E] mb-4" />
              <h3 className="text-xl font-semibold mb-4 text-[#F37022]">Get an Answer</h3>
              <p className="text-gray-600">Powered by legal outlines, case summaries, and the AI equivalent of an over-caffeinated 3L.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <Rocket className="w-12 h-12 text-[#00178E] mb-4" />
              <h3 className="text-xl font-semibold mb-4 text-[#F37022]">Pass Your Exam</h3>
              <p className="text-gray-600">We can&apos;t guarantee an A, but we can make sure you at least sound like you know what you&apos;re talking about.</p>
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
              Your personal legal study companion that&apos;s always ready to help, without the hefty price tag.
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

      {/* Example Questions */}
      <section className="py-20 bg-[#00178E]/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-black mb-4">What Can You Ask?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From basic concepts to existential crises, we&apos;ve got you covered.
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
        </div>
      </section>
    </div>
  );
}