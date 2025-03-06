import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, BookOpen, Plus, Sparkles, Zap, Lock } from 'lucide-react';
import { createCheckoutSession } from '@/lib/subscription';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Function to handle subscription checkout
  const handleSubscribe = async () => {
    try {
      setIsLoading(true);
      const checkoutUrl = await createCheckoutSession();
      
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create checkout session. Please try again later.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-12 text-center">
        <Brain className="h-16 w-16 text-[#F37022] mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Upgrade to FlashMaster Premium
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Enhance your learning experience with our interactive flashcard system and advanced AI features
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <BookOpen className="h-12 w-12 text-[#F37022]" />
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">Standard</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Flashcards</h2>
          <ul className="space-y-3 mb-6">
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="dark:text-gray-300">Create unlimited collections</span>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="dark:text-gray-300">Track your study progress</span>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="dark:text-gray-300">Organize by subjects</span>
            </li>
          </ul>
          <span className="block text-gray-600 dark:text-gray-400 mb-6">Perfect for students who want to enhance their study habits.</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md relative border-2 border-[#F37022]">
          <div className="absolute -top-3 right-4 px-3 py-1 bg-[#F37022] text-white rounded-full text-sm font-medium">
            Most Popular
          </div>
          <div className="flex justify-between items-center mb-4">
            <Sparkles className="h-12 w-12 text-[#F37022]" />
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">Premium</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">AI Premium</h2>
          <ul className="space-y-3 mb-6">
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="dark:text-gray-300">All Flashcard features</span>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="dark:text-gray-300">Unlimited AI chat messages</span>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="dark:text-gray-300">Advanced AI capabilities</span>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="dark:text-gray-300">Priority support</span>
            </li>
          </ul>
          <span className="block text-gray-600 dark:text-gray-400 mb-6">Complete access to all features for power users.</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <Zap className="h-12 w-12 text-[#F37022]" />
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">Basic</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">AI Standard</h2>
          <ul className="space-y-3 mb-6">
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="dark:text-gray-300">500 AI messages per month</span>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="dark:text-gray-300">Standard AI capabilities</span>
            </li>
            <li className="flex items-start text-gray-400 dark:text-gray-500">
              <div className="flex-shrink-0 h-5 w-5 text-gray-300 dark:text-gray-600 mr-2">
                <Lock className="h-5 w-5" />
              </div>
              <span>No flashcards feature</span>
            </li>
          </ul>
          <span className="block text-gray-600 dark:text-gray-400 mb-6">Entry-level plan for those who need AI assistance.</span>
        </div>
      </div>

      <div className="text-center mb-12">
        <button 
          onClick={handleSubscribe}
          className="px-8 py-3 bg-[#F37022] text-white rounded-md hover:bg-[#E36012] shadow-lg text-lg font-medium inline-flex items-center"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Processing...
            </>
          ) : (
            <>Upgrade Now</>
          )}
        </button>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Cancel anytime. 7-day money-back guarantee.</p>
      </div>

      {user && (
        <div className="flex justify-center">
          <Link
            to="/flashcards/collections"
            className="text-[#F37022] hover:text-[#E36012] font-medium"
          >
            Continue to browse collections
          </Link>
        </div>
      )}
    </div>
  );
} 