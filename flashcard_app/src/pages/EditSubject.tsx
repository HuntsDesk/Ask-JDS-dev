import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import useToast from '../hooks/useToast';
import Toast from '../components/Toast';

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
      } catch (err) {
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
        navigate('/subjects');
      }, 1500);
    } catch (err) {
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
          to: '/subjects',
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
        <Link to="/subjects" className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" />
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
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={4}
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
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