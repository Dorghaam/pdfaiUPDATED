'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PDFUpload from '../components/PDFUpload';
import PDFListItem from '../components/PDFListItem';
import Header from '../components/Header';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument } from '@/app/models/types';

export default function UploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfHistory, setPdfHistory] = useState<PDFDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch user's PDF documents on component mount
  useEffect(() => {
    const fetchUserPDFs = async () => {
      setIsLoading(true);
      setFetchError(null);
      
      try {
        const response = await fetch('/api/pdfs');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch PDF documents');
        }
        
        const data = await response.json();
        setPdfHistory(data.documents || []);
      } catch (err: any) {
        console.error('Error fetching PDF documents:', err);
        setFetchError(err.message || 'Failed to load your PDF documents. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserPDFs();
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Create a unique identifier for this PDF
    const pdfId = uuidv4();
    formData.append('pdfId', pdfId);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Check if we need to redirect to login
        if (errorData.redirectTo) {
          router.push(errorData.redirectTo);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to upload PDF');
      }

      const result = await response.json();
      
      // Navigate to the chat page with the file ID
      router.push(`/chat/${encodeURIComponent(result.fileId)}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePDF = async (id: string) => {
    try {
      const response = await fetch(`/api/pdfs?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete PDF');
      }
      
      // Update local state to remove the deleted PDF
      setPdfHistory(pdfHistory.filter(doc => doc.id !== id));
    } catch (err: any) {
      console.error('Error deleting PDF:', err);
      throw err;
    }
  };

  const hasReachedLimit = pdfHistory.length >= 5;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 font-[family-name:var(--font-geist-sans)]">
      <Header />

      <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Your PDF Dashboard</h1>
        
        {!hasReachedLimit ? (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-center">Upload a New PDF</h2>
            
            <PDFUpload onFileUpload={handleFileUpload} />
            
            {isUploading && (
              <div className="mt-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="ml-2 text-sm text-gray-600 dark:text-gray-400">Uploading PDF...</p>
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-md text-sm">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-900/30 p-6 rounded-lg shadow-sm border border-amber-200 dark:border-amber-800 mb-6">
            <h2 className="text-lg font-medium text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              PDF Limit Reached
            </h2>
            <p className="mt-2 text-amber-700 dark:text-amber-300 text-sm">
              You have reached the maximum limit of 5 PDFs. Please delete some PDFs below before uploading a new one.
            </p>
          </div>
        )}
        
        <div className="mt-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <h2 className="text-xl font-semibold">Chat Documents</h2>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">{pdfHistory.length} document{pdfHistory.length !== 1 ? 's' : ''}</span>
          </div>
          
          {isLoading ? (
            <div className="p-8 flex justify-center items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              <p className="ml-3 text-gray-600 dark:text-gray-400">Loading your documents...</p>
            </div>
          ) : fetchError ? (
            <div className="p-6 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-md">
              <p>{fetchError}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
              >
                Try Again
              </button>
            </div>
          ) : pdfHistory.length === 0 ? (
            <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
              <div className="flex justify-center mb-4 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">No documents yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Upload your first PDF to start chatting</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pdfHistory.map((doc) => (
                <PDFListItem 
                  key={doc.id} 
                  document={doc}
                  onDelete={handleDeletePDF}
                />
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mt-6">
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <li>Upload your PDF document</li>
            <li>Our AI will process and analyze the content</li>
            <li>You'll be redirected to the chat page</li>
            <li>Ask questions about your document and get accurate answers based on the content</li>
          </ol>
        </div>
      </main>

      <footer className="w-full p-6 border-t border-gray-200 dark:border-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-600 dark:text-gray-400">
          <p>PDF AI Chat - Powered by Next.js, LangChain, Supabase and OpenAI</p>
          <p className="mt-1">© {new Date().getFullYear()} Your Company</p>
        </div>
      </footer>
    </div>
  );
}