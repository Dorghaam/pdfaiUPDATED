'use server';

// Import pdf-parse with explicit require to avoid potential path issues
import * as pdfParseLib from 'pdf-parse';
const pdfParse = pdfParseLib.default || pdfParseLib;
import { ParsedPDF } from '../models/types';
import { createServerSupabaseClient } from '../lib/supabaseClient';

/**
 * Parses a PDF file and extracts its content and metadata
 * @param file The PDF file to parse
 * @returns Promise resolving to a ParsedPDF object
 */
export async function parsePDF(file: File): Promise<ParsedPDF> {
  // Convert File to ArrayBuffer
  const buffer = await file.arrayBuffer();
  
  try {
    // Extract text page by page
    const pageTexts: Array<{ pageNumber: number; text: string }> = [];
    
    // First get document info and total pages
    const data = await pdfParse(new Uint8Array(buffer));
    const totalPages = data.numpages || 0;
    
    // Extract metadata
    const metadata = {
      info: data.info || {},
      pageCount: totalPages,
      title: data.info?.Title || undefined,
      author: data.info?.Author || undefined,
      creationDate: data.info?.CreationDate 
        ? new Date(data.info.CreationDate) 
        : undefined,
    };
    
    // Extract text from each page separately
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const pageText = await extractPageText(file, pageNum);
        pageTexts.push({
          pageNumber: pageNum,
          text: pageText
        });
      } catch (pageError) {
        console.error(`Error extracting text from page ${pageNum}:`, pageError);
        // Continue with empty text for this page
        pageTexts.push({
          pageNumber: pageNum,
          text: ''
        });
      }
    }
    
    // Combine all page texts into a single string for backward compatibility
    const text = pageTexts.map(page => page.text).join(' ');
    
    // Use the combined text for chunking for backward compatibility
    const chunkSize = 1000;
    const chunks = [];
    
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      chunks.push(chunk);
    }
    
    return {
      text,
      metadata,
      chunks,
      pageTexts,
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}

/**
 * Validates a file to ensure it is a valid PDF
 * @param file The file to validate
 * @returns Boolean indicating if the file is valid
 */
export async function validatePDFFile(file: File): Promise<boolean> {
  // Check file type
  if (file.type !== 'application/pdf') {
    return false;
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return false;
  }

  return true;
}

/**
 * Extracts text from a specific page of a PDF
 * @param file The PDF file
 * @param pageNum The page number to extract (1-based index)
 * @returns Promise resolving to the text content of the specified page
 */
export async function extractPageText(file: File, pageNum: number): Promise<string> {
  const buffer = await file.arrayBuffer();

  try {
    const options = {
      max: pageNum, // Parse up to this page
      pagerender: async (pageData: any) => {
        if (pageData.pageIndex === pageNum - 1) {
          return pageData.getTextContent();
        }
        // Skip other pages
        return Promise.resolve();
      }
    };

    const data = await pdfParse(new Uint8Array(buffer), options);
    return data.text || '';
  } catch (error) {
    console.error(`Error extracting text from page ${pageNum}:`, error);
    throw new Error(`Failed to extract text from page ${pageNum}`);
  }
}

/**
 * Parses a PDF from a URL and extracts its content and metadata
 * @param url The URL of the PDF to parse
 * @returns Promise resolving to a ParsedPDF object
 */
export async function parsePDFFromUrl(url: string): Promise<ParsedPDF> {
  try {
    // Fetch the PDF file from the URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF from URL: ${response.statusText}`);
    }

    // Convert the response to ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // First get document info and total pages
    const data = await pdfParse(buffer);
    const totalPages = data.numpages || 0;

    // Extract metadata
    const metadata = {
      info: data.info || {},
      pageCount: totalPages,
      title: data.info?.Title || undefined,
      author: data.info?.Author || undefined,
      creationDate: data.info?.CreationDate
        ? new Date(data.info.CreationDate)
        : undefined,
    };

    // Extract text from each page
    const pageTexts: Array<{ pageNumber: number; text: string }> = [];
    
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        // Extract text for each page individually
        const options = {
          max: pageNum,
          min: pageNum
        };
        
        const pageData = await pdfParse(buffer, options);
        pageTexts.push({
          pageNumber: pageNum,
          text: pageData.text || ''
        });
      } catch (pageError) {
        console.error(`Error extracting text from page ${pageNum}:`, pageError);
        // Continue with empty text for this page
        pageTexts.push({
          pageNumber: pageNum,
          text: ''
        });
      }
    }

    // Combine all page texts into a single string for backward compatibility
    const text = pageTexts.map(page => page.text).join(' ');
    
    // Split text into chunks (approximately 1000 characters each)
    const chunkSize = 1000;
    const chunks = [];

    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      chunks.push(chunk);
    }

    return {
      text,
      metadata,
      chunks,
      pageTexts,
    };
  } catch (error) {
    console.error('Error parsing PDF from URL:', error);
    throw new Error('Failed to parse PDF file from URL');
  }
}