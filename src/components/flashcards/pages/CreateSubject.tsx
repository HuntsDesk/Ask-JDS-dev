import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';
import useToast from '@/hooks/useFlashcardToast';
import Toast from '../Toast';

export default function CreateSubject() {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = () => {
    if (!name.trim()) return 'Please enter a subject name';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }
    
    try {
      setSaving(true);
      
      // Create the subject
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .insert([{ 
          name, 
          description,
          is_official: false
        }])
        .select()
        .single();
      
      if (subjectError) throw subjectError;
      
      showToast('Subject created successfully!', 'success');
      navigate('/flashcards/subjects');
      
    } catch (err) {
      setError(err.message);
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Toast notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}
      
      {error && <ErrorMessage message={error} />}
      
      <div className="mb-8">
        <Link to="/flashcards/subjects" className="text-[#F37022] hover:text-[#E36012] flex items-center gap-2">
          <ChevronLeft className="h-5 w-5" />
          Back to Subjects
        </Link>
        <h1 className="text-3xl font-bold mt-4">Create Subject</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="p-6">
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Subject Name*
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#F37022] focus:border-[#F37022]"
              placeholder="e.g. Biology, Mathematics, History"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#F37022] focus:border-[#F37022]"
              placeholder="Optional description of this subject"
              rows={3}
            />
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center bg-[#F37022] text-white px-6 py-2 rounded-md hover:bg-[#E36012] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F37022]"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Create Subject
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 