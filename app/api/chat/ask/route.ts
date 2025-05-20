import { NextRequest, NextResponse } from 'next/server';
import { askQuestionInSession } from '@/app/services/langchainService';
import { createServerSupabaseClient } from '@/app/lib/supabaseClient';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

interface AskRequest {
  message: string;
  sessionId: string;
  fileId?: string; // Optional for context
  level?: string; // Explanation level
}

/**
 * Retrieves the primary key (id) of a PDF document from Supabase
 * @param fileIdFromRequest Storage path of the file (uuid-filename.pdf)
 * @param userId The authenticated user's UUID
 * @returns The UUID primary key of the document
 */
async function getPdfDocumentPkId(fileIdFromRequest: string, userId: string) {
  const supabase = createServerSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('pdf_documents')
      .select('id')
      .eq('file_id', fileIdFromRequest)
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      console.error('Error retrieving PDF document ID:', error);
      throw new Error('PDF document primary key not found for the given fileId and userId');
    }
    
    return data.id;
  } catch (error) {
    console.error('Error in getPdfDocumentPkId:', error);
    throw new Error('PDF document primary key not found for the given fileId and userId');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AskRequest;
    const { message, sessionId, level, fileId } = body;
    
    if (!message || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: message and sessionId' },
        { status: 400 }
      );
    }
    
    // Get authenticated user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const authUserId = user.id;
    
    // Check if fileId is provided
    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId is required to save chat message' },
        { status: 400 }
      );
    }
    
    // Get PDF document primary key
    let pdfDocumentPkId;
    try {
      pdfDocumentPkId = await getPdfDocumentPkId(fileId, authUserId);
    } catch (error: any) {
      console.error('Error getting PDF document ID:', error);
      return NextResponse.json(
        { error: 'Associated PDF document not found' },
        { status: 404 }
      );
    }
    
    // Save user's message to chat_messages table
    const supabaseAdmin = createServerSupabaseClient();
    const { error: insertError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        pdf_document_id: pdfDocumentPkId,
        user_id: authUserId,
        session_id: sessionId,
        role: 'user',
        content: message,
        source_documents: null
      });
    
    if (insertError) {
      console.error('Error saving user message to database:', insertError);
      return NextResponse.json(
        { error: 'Failed to save user message' },
        { status: 500 }
      );
    }
    
    // Process the message using the session
    try {
      const response = await askQuestionInSession(message, sessionId, level);
      
      // Save AI assistant's response to chat_messages table
      const { error: assistantInsertError } = await supabaseAdmin
        .from('chat_messages')
        .insert({
          pdf_document_id: pdfDocumentPkId,
          user_id: authUserId,
          session_id: sessionId,
          role: 'assistant',
          content: response.answer,
          source_documents: response.sourceDocuments || null
        });
      
      if (assistantInsertError) {
        // Log error but continue to return response to client
        console.error('Error saving assistant message to database:', assistantInsertError);
      }
      
      // Return the response with source documents
      return NextResponse.json(response);
    } catch (error: any) {
      console.error('Error processing message:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to process question. Session may not be initialized.' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}