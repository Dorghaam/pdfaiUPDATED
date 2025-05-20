import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create a Supabase client with admin privileges for direct table access
const createServerSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseServiceKey);
};

export async function GET(request: Request) {
  // Get fileId from the query parameters
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return NextResponse.json(
      { error: 'fileId parameter is required' },
      { status: 400 }
    );
  }

  // Create Supabase client for authentication
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // Authenticate the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const authUserId = user.id;

    // Create admin client for direct table access
    const adminClient = createServerSupabaseClient();

    // Retrieve pdf_document_id based on fileId and user
    const { data: document, error: docError } = await adminClient
      .from('pdf_documents')
      .select('id')
      .eq('file_id', fileId)
      .eq('user_id', authUserId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Associated PDF document not found for this user' },
        { status: 404 }
      );
    }

    const pdfDocumentPkId = document.id;

    // Fetch chat messages associated with the document and user
    const { data: messages, error: messagesError } = await adminClient
      .from('chat_messages')
      .select('id, role, content, created_at, source_documents')
      .eq('pdf_document_id', pdfDocumentPkId)
      .eq('user_id', authUserId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching chat messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to retrieve chat history' },
        { status: 500 }
      );
    }

    // Return the messages
    return NextResponse.json({ history: messages });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 