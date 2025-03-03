import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  title: string;
  description: string;
  icon: ReactNode;
  actionText?: string;
  actionLink?: string;
}

export default function EmptyState({
  title,
  description,
  icon,
  actionText,
  actionLink
}: EmptyStateProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
      <div className="inline-flex justify-center items-center p-6 bg-gray-100 rounded-full mb-6">
        {icon}
      </div>
      
      <h3 className="text-xl font-medium text-gray-800 mb-2">{title}</h3>
      
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {description}
      </p>
      
      {actionText && actionLink && (
        <Link
          to={actionLink}
          className="inline-flex items-center justify-center bg-[#F37022] text-white px-6 py-3 rounded-md hover:bg-[#E36012]"
        >
          {actionText}
        </Link>
      )}
    </div>
  );
} 