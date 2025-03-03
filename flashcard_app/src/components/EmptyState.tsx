import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FileText, BookOpen, Library } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: 'file' | 'book' | 'library';
  actions?: ReactNode;
}

export default function EmptyState({ title, description, icon = 'file', actions }: EmptyStateProps) {
  const getIcon = () => {
    switch (icon) {
      case 'book':
        return <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />;
      case 'library':
        return <Library className="h-16 w-16 text-gray-400 mx-auto mb-4" />;
      case 'file':
      default:
        return <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />;
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md text-center">
      {getIcon()}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
      <p className="text-gray-600 mb-6">{description}</p>
      {actions}
    </div>
  );
}