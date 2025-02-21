import React from 'react';
import {
  Brain,
  BookOpen,
  Clock,
  DollarSign,
  MessageSquare,
  Rocket,
  CheckCircle2,
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

function App() {
  const benefits = [
    {
      icon: Shield,
      title: "No Judgment Zone",
      description: "We won't ask why you're learning Crim Pro at 2 AM.",
      color: "text-[#F37022]",
      gradient: "from-[#F37022]/20 to-[#F37022]/5"
    },
    {
      icon: Zap,
      title: "Fast & Accurate",
      description: "Like that one student who always had the perfect cold-call answer.",
      color: "text-[#00178E]",
      gradient: "from-[#00178E]/20 to-[#00178E]/5"
    },
    {
      icon: GraduationCap,
      title: "Trained on Real Law Student Resources",
      description: "Because bar exam prep shouldn't feel like deciphering the Rosetta Stone.",
      color: "text-[#F37022]",
      gradient: "from-[#F37022]/20 to-[#F37022]/5"
    },
    {
      icon: PiggyBank,
      title: "Only $5/Month",
      description: '$5 dolla make you holla (because law school is already expensive enough).',
      color: "text-[#00178E]",
      gradient: "from-[#00178E]/20 to-[#00178E]/5"
    }
  ];

  const questions = [
    {
      icon: Lightbulb,
      text: "Explain promissory estoppel like I'm five.",
      category: "Concept Clarification",
      color: "text-[#F37022]",
      bgColor: "bg-[#F37022]/5"
    },
    {
      icon: HelpCircle,
      text: "What's the difference between negligence and strict liability?",
      category: "Legal Distinctions",
      color: "text-[#00178E]",
      bgColor: "bg-[#00178E]/5"
    },
    {
      icon: MessagesSquare,
      text: "Does this outline make sense, or have I completely lost my mind?",
      category: "Study Review",
      color: "text-[#F37022]",
      bgColor: "bg-[#F37022]/5"
    },
    {
      icon: Coffee,
      text: "If I drop out now, how much debt will haunt me? (Just kidding… kinda.)",
      category: "Life Advice",
      color: "text-[#00178E]",
      bgColor: "bg-[#00178E]/5"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#00178E]/5 via-white to-[#F37022]/5">
          <div className="absolute inset-0 bg-[linear-gradient(30deg,#f0f0f0_12%,transparent_12.5%,transparent_87%,#f0f0f0_87.5%,#f0f0f0)] bg-[length:16px_16px] opacity-20"></div>
        </div>

        <div className="relative px-4 py-16 md:py-20">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col items-center text-center">
              {/* Floating Icons */}
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute top-0 left-0 animate-float-slow">
                  <Brain className="w-20 h-20 text-[#00178E]" />
                </div>
                <div className="absolute -top-3 -right-3 animate-float-delayed">
                  <Scale className="w-10 h-10 text-[#F37022] opacity-60" />
                </div>
                <div className="absolute -bottom-2 -left-4 animate-float">
                  <BookOpenCheck className="w-8 h-8 text-[#00178E] opacity-70" />
                </div>
                <div className="absolute -bottom-3 -right-2">
                  <Sparkles className="w-6 h-6 text-[#F37022] animate-pulse" />
                </div>
              </div>

              {/* Main Content */}
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-bold text-[#00178E] tracking-tight">
                  Ask JDS
                </h1>
                <h2 className="text-xl md:text-2xl text-[#F37022] font-medium">
                  The Only Law Study Buddy That Won't Judge You for Procrastinating
                </h2>
                <h3 className="text-2xl md:text-3xl font-semibold text-gray-800 mt-4">
                  Struggling with Law School? The Bar Exam?
                </h3>
                <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                  Welcome to <span className="font-semibold">Ask JDS</span>, where you can throw your burning law school and bar prep questions at a friendly AI tutor who won't shame you for forgetting the rule against perpetuities (again).
                </p>

                {/* CTA Button */}
                <div className="mt-8">
                  <button className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-[#00178E] to-[#00178E]/90 rounded-full overflow-hidden shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#F37022] to-[#F37022]/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out"></span>
                    <span className="relative">Get Started for $5/Month</span>
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </button>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-1/2 left-0 transform -translate-y-1/2 opacity-10">
                <div className="w-64 h-64 bg-[#00178E] rounded-full filter blur-3xl"></div>
              </div>
              <div className="absolute bottom-0 right-0 opacity-10">
                <div className="w-96 h-96 bg-[#F37022] rounded-full filter blur-3xl"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* How It Works */}
      <section className="py-20 bg-[#00178E]/5">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16 text-[#00178E]">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <MessageSquare className="w-12 h-12 text-[#F37022] mb-4" />
              <h3 className="text-xl font-semibold mb-4 text-[#00178E]">Ask a Question</h3>
              <p className="text-gray-600">Type in your legal query. Bar prep, case law, general despair—it's all fair game.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <Brain className="w-12 h-12 text-[#F37022] mb-4" />
              <h3 className="text-xl font-semibold mb-4 text-[#00178E]">Get an Answer</h3>
              <p className="text-gray-600">Powered by legal outlines, case summaries, and the AI equivalent of an over-caffeinated 3L.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <Rocket className="w-12 h-12 text-[#F37022] mb-4" />
              <h3 className="text-xl font-semibold mb-4 text-[#00178E]">Pass Your Exam</h3>
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
            <h2 className="text-4xl font-bold text-[#00178E] mb-4">Why Use Ask JDS?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Your personal legal study companion that's always ready to help, without the hefty price tag.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                
                {/* Content */}
                <div className="relative flex items-start space-x-5">
                  <div className={`${benefit.color} bg-white p-3 rounded-xl shadow-sm`}>
                    <benefit.icon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#00178E] mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 group-hover:text-gray-700 transition-colors">
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
            <h2 className="text-4xl font-bold text-[#00178E] mb-4">What Can You Ask?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From basic concepts to existential crises, we've got you covered.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {questions.map((question, index) => (
              <div 
                key={index} 
                className={`${question.bgColor} p-6 rounded-2xl transition-all duration-300 hover:shadow-lg group`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`${question.color} bg-white p-3 rounded-xl shadow-sm`}>
                    <question.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className={`text-sm font-medium ${question.color} mb-2 block`}>
                      {question.category}
                    </span>
                    <p className="text-lg text-gray-800 group-hover:text-gray-900 transition-colors">
                      {question.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#00178E] text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Sign Up Now</h2>
          <p className="text-xl mb-8">
            Skip the overpriced tutors and questionable Reddit advice—Ask JDS is your $5/month legal survival guide.
          </p>
          <button className="bg-[#F37022] text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-[#F37022]/90 transition-colors inline-flex items-center">
            Join Now for $5/Month
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-[#00178E]">
        <p className="text-lg font-semibold">Ask JDS. Smarter than your group chat, cheaper than a tutor.</p>
      </footer>
    </div>
  );
}

export default App;