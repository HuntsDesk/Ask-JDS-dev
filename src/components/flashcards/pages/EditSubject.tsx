import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save, ArrowLeft, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';
import useToast from '@/hooks/useFlashcardToast';
import Toast from '../Toast';

interface Subject {
  id: string;
  name: string;
  description: string;
  is_official: boolean;
}

export default function EditSubject() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSubject() {
      try {
        if (!id) return;
        
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        
        // Check if subject is official
        if (data.is_official) {
          setError("Official subjects cannot be edited");
          setLoading(false);
          return;
        }
        
        setSubject(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadSubject();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject) return;

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('subjects')
        .update({
          name: subject.name,
          description: subject.description
        })
        .eq('id', id)
        .eq('is_official', false);

      if (error) throw error;
      
      showToast('Subject updated successfully', 'success');
      setTimeout(() => {
        navigate('/flashcards/subjects');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !subject) {
    return (
      <ErrorMessage 
        message={error || 'Subject not found'} 
        backLink={{
          to: '/flashcards/subjects',
          label: 'Back to Subjects'
        }}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}
      
      <div className="mb-8">
        <Link to="/flashcards/subjects" className="text-[#F37022] hover:text-[#E36012] flex items-center gap-2">
          <ChevronLeft className="h-5 w-5" />
          Back to Subjects
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Edit Subject</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Subject Name
            </label>
            <input
              type="text"
              id="name"
              value={subject.name}
              onChange={(e) => setSubject({ ...subject, name: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#F37022] focus:ring-[#F37022]"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={subject.description || ''}
              onChange={(e) => setSubject({ ...subject, description: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#F37022] focus:ring-[#F37022]"
              rows={4}
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#F37022] text-white px-6 py-2 rounded-md hover:bg-[#E36012] disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 