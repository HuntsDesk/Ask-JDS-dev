import React from 'react';
import { Link } from 'react-router-dom';

interface ErrorMessageProps {
  message: string;
  backLink?: {
    to: string;
    label: string;
  };
}

export default function ErrorMessage({ message, backLink }: ErrorMessageProps) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {message}
      </div>
      {backLink && (
        <Link to={backLink.to} className="mt-4 inline-block text-indigo-600 hover:text-indigo-700">
          ← {backLink.label}
        </Link>
      )}
    </div>
  );
}