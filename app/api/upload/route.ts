import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createServerSupabaseClient } from '@/app/lib/supabaseClient';
import { parsePDF } from '@/app/services/pdfParser';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(request: NextRequest) {
  try {
    // Create a Supabase client with cookie-based auth
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', redirectTo: '/login' },
        { status: 401 }
      );
    }
    
    // Fetch user's subscription tier and status
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', user.id)
      .single();
      
    let userTier = 'free'; // Default tier
    let userStatus = 'active'; // Default status for free
    
    if (subscriptionError) {
      console.error('Error fetching user subscription, defaulting to free:', subscriptionError.message);
      // Keep default 'free' / 'active'
    } else if (subscriptionData) {
      userTier = subscriptionData.tier;
      userStatus = subscriptionData.status || 'active'; // Ensure status has a fallback
    } else {
      console.warn('No subscription record found for user, defaulting to free. Ensure ensure_user_subscription trigger is working.');
      // Keep default 'free' / 'active'
    }
    
    // Define daily PDF limit based on tier
    const dailyPdfLimit = userTier === 'premium' && userStatus === 'active' ? 10 : 1;
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Count PDFs uploaded today
    const { count: pdfsUploadedTodayCount, error: countTodayError } = await supabase
      .from('pdf_documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('uploaded_today_at', today);
      
    if (countTodayError) {
      console.error('Error checking today\'s PDF count:', countTodayError);
      return NextResponse.json(
        { error: 'Failed to check daily document limit' },
        { status: 500 }
      );
    }
    
    // Enforce daily limit
    if (pdfsUploadedTodayCount != null && pdfsUploadedTodayCount >= dailyPdfLimit) {
      return NextResponse.json(
        { error: `Daily limit of ${dailyPdfLimit} PDF${dailyPdfLimit === 1 ? '' : 's'} reached for your ${userTier} tier.${userTier === 'free' ? ' Upgrade to premium for a higher limit.' : ''}` },
        { status: 429 }
      );
    }
    
    const formData = await request.formData();
    const pdfFile = formData.get('file') as File;
    
    if (!pdfFile) {
      return NextResponse.json(
        { error: 'Missing required file' },
        { status: 400 }
      );
    }
    
    // Generate a unique filename with UUID
    const fileName = `${uuidv4()}-${pdfFile.name}`;
    
    // Get supabase client with admin privileges
    const supabaseAdmin = createServerSupabaseClient();
    
    // Upload file to Supabase storage
    const { data, error } = await supabaseAdmin.storage
      .from('pdfs')
      .upload(fileName, pdfFile, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (error) {
      console.error('Error uploading to Supabase:', error);
      return NextResponse.json(
        { error: 'Failed to upload PDF to storage' },
        { status: 500 }
      );
    }
    
    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('pdfs')
      .getPublicUrl(fileName);
    
    // Parse the PDF to get metadata (for later use in initializing chat)
    const parsedPdf = await parsePDF(pdfFile);
    
    // Insert record into pdf_documents table
    const { error: insertError } = await supabaseAdmin
      .from('pdf_documents')
      .insert({
        user_id: user.id,
        file_id: fileName,
        file_name: pdfFile.name,
        storage_path: data.path,
        title: parsedPdf.metadata.title || 'Untitled Document',
        page_count: parsedPdf.metadata.pageCount
      });
      
    if (insertError) {
      console.error('Error inserting PDF record:', insertError);
      // Try to clean up the uploaded file if database insertion fails
      await supabaseAdmin.storage.from('pdfs').remove([fileName]);
      return NextResponse.json(
        { error: 'Failed to save PDF metadata' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      fileId: fileName,
      publicUrl,
      metadata: {
        pageCount: parsedPdf.metadata.pageCount,
        title: parsedPdf.metadata.title || 'Untitled Document'
      }
    });
  } catch (error: any) {
    console.error('Error in PDF upload API:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF upload' },
      { status: 500 }
    );
  }
}