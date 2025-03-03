import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, BookOpen, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DeleteConfirmation from './DeleteConfirmation';
import LoadingSpinner from './LoadingSpinner';
import SubjectCard from './SubjectCard';
import useToast from '@/hooks/useFlashcardToast';
import Toast from './Toast';

interface Subject {
  id: string;
  name: string;
  description: string;
  is_official: boolean;
  created_at: string;
  collection_count?: number;
}

export default function FlashcardSubjects() {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    try {
      setLoading(true);
      
      // Get all subjects
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('is_official', { ascending: false })
        .order('name');
      
      if (error) throw error;
      
      // Get collection counts for each subject
      const subjectsWithCounts = await Promise.all(
        (data || []).map(async (subject) => {
          const { count, error: countError } = await supabase
            .from('flashcard_collections')
            .select('*', { count: 'exact', head: true })
            .eq('subject_id', subject.id);
            
          if (countError) throw countError;
          
          return {
            ...subject,
            collection_count: count || 0
          };
        })
      );
      
      setSubjects(subjectsWithCounts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleAddSubject = () => {
    navigate('/flashcards/create?newSubject=true');
  };

  const handleDeleteSubject = async () => {
    if (!subjectToDelete) return;
    
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectToDelete.id)
        .eq('is_official', false);
      
      if (error) throw error;
      
      setSubjects(subjects.filter(s => s.id !== subjectToDelete.id));
      setSubjectToDelete(null);
      showToast('Subject deleted successfully', 'success');
    } catch (err: any) {
      setError(err.message);
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleStudySubject = (subjectId: string) => {
    navigate(`/flashcards/subjects/${subjectId}`);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const officialSubjects = subjects.filter(subject => subject.is_official);
  const userSubjects = subjects.filter(subject => !subject.is_official);

  return (
    <div className="max-w-6xl mx-auto">
      <DeleteConfirmation
        isOpen={!!subjectToDelete}
        onClose={() => setSubjectToDelete(null)}
        onConfirm={handleDeleteSubject}
        title="Delete Subject"
        message="Are you sure you want to delete this subject? This won't delete collections in this subject."
        itemName={subjectToDelete?.name}
      />

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Subjects</h1>
        <div className="flex gap-4">
          <button
            onClick={handleAddSubject}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5" />
            Add Subject
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Official Subjects</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {officialSubjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              id={subject.id}
              name={subject.name}
              description={subject.description}
              isOfficial={subject.is_official}
              collectionCount={subject.collection_count || 0}
              onStudy={() => handleStudySubject(subject.id)}
              showDeleteButton={false}
            />
          ))}
        </div>
      </div>

      {userSubjects.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">User-Created Subjects</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userSubjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                id={subject.id}
                name={subject.name}
                description={subject.description}
                isOfficial={subject.is_official}
                collectionCount={subject.collection_count || 0}
                onStudy={() => handleStudySubject(subject.id)}
                onDelete={() => setSubjectToDelete(subject)}
                showDeleteButton={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 