import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, BookOpen, Lock, Filter } from 'lucide-react';
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

type SubjectFilter = 'all' | 'official' | 'my';

export default function FlashcardSubjects() {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [filter, setFilter] = useState<SubjectFilter>('all');

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
    navigate('/flashcards/create-subject');
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

  // Filter subjects based on the selected filter
  const filteredSubjects = () => {
    if (filter === 'official') return officialSubjects;
    if (filter === 'my') return userSubjects;
    return subjects; // 'all'
  };

  // Handle filter change
  const handleFilterChange = (newFilter: SubjectFilter) => {
    setFilter(newFilter);
  };

  // Get section title based on current filter
  const getSectionTitle = () => {
    if (filter === 'official') return "Official Subjects";
    if (filter === 'my') return "My Subjects";
    return "Subjects";
  };

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
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">{getSectionTitle()}</h2>
        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-4 py-1.5 text-sm ${filter === 'all' ? 'bg-[#F37022] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            All
          </button>
          <button
            onClick={() => handleFilterChange('official')}
            className={`px-4 py-1.5 text-sm ${filter === 'official' ? 'bg-[#F37022] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            Official
          </button>
          <button
            onClick={() => handleFilterChange('my')}
            className={`px-4 py-1.5 text-sm ${filter === 'my' ? 'bg-[#F37022] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            My Subjects
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {(filter === 'all' || filter === 'official') && officialSubjects.length > 0 && (
        <div className="mb-12">
          {filter === 'all' && (
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-gray-800">Official Subjects</h3>
            </div>
          )}
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
      )}

      {(filter === 'all' || filter === 'my') && userSubjects.length > 0 && (
        <div className="mb-12">
          {filter === 'all' && (
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-gray-800">My Subjects</h3>
            </div>
          )}
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

      {/* Show empty state when no subjects match the filter */}
      {(filter === 'official' && officialSubjects.length === 0) || 
       (filter === 'my' && userSubjects.length === 0) || 
       (filter === 'all' && subjects.length === 0) ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects found</h3>
          <p className="text-gray-600 mb-6">
            {filter === 'my' ? 'You haven\'t created any subjects yet.' : 'No subjects match your current filter.'}
          </p>
        </div>
      ) : null}
    </div>
  );
} 