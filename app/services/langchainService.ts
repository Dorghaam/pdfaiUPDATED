'use server';

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { ChatOpenAI } from 'langchain/chat_models/openai';
// Import from @langchain/core packages
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from '@langchain/core/output_parsers';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { ParsedPDF } from './pdfParser';

// Initialize environment variables (should be set in .env.local)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY is not set. LangChain service will not work properly.');
}

// Store active chat sessions
const activeSessions: Record<string, PDFChatServiceImpl> = {};

/**
 * Splits the PDF text into chunks for processing
 */
async function splitTextIntoChunks(text: string) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  
  return await splitter.splitText(text);
}

/**
 * Creates a vector store from the PDF text chunks
 */
async function createVectorStore(chunks: string[], metadatas?: any[]) {
  try {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: OPENAI_API_KEY,
    });
    
    // If metadatas provided (page numbers), use them
    if (metadatas && metadatas.length === chunks.length) {
      return await MemoryVectorStore.fromTexts(
        chunks,
        metadatas,
        embeddings
      );
    } else {
      // Fallback to empty metadata
      return await MemoryVectorStore.fromTexts(
        chunks,
        chunks.map(() => ({})),
        embeddings
      );
    }
  } catch (error) {
    console.error('Error creating vector store:', error);
    throw new Error('Failed to create vector store for PDF content');
  }
}

/**
 * Server-side implementation of the PDF Chat Service
 */
class PDFChatServiceImpl {
  private vectorStore: MemoryVectorStore | null = null;
  private chatHistory: (HumanMessage | AIMessage)[] = [];
  private retrievalChain: any = null;
  
  /**
   * Initializes the service with a parsed PDF
   */
  async initialize(parsedPDF: ParsedPDF) {
    try {
      // Check if we have page-specific text
      if (parsedPDF.pageTexts && parsedPDF.pageTexts.length > 0) {
        // Create text splitter
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200,
        });

        // Process each page individually to maintain page number metadata
        const allChunks: string[] = [];
        const allMetadata: Array<{ pageNumber: number }> = [];

        // Process each page
        for (const page of parsedPDF.pageTexts) {
          if (!page.text) continue;
          
          // Split this page's text into chunks
          const pageChunks = await splitter.splitText(page.text);
          
          // Add chunks with page metadata
          pageChunks.forEach(chunk => {
            allChunks.push(chunk);
            allMetadata.push({ pageNumber: page.pageNumber });
          });
        }

        if (allChunks.length > 0) {
          // Create vector store with page-specific chunks
          this.vectorStore = await createVectorStore(allChunks, allMetadata);
        } else {
          // Fallback to the old method if no chunks were created
          const chunks = parsedPDF.chunks.length > 0 
            ? parsedPDF.chunks 
            : await splitTextIntoChunks(parsedPDF.text);
          
          this.vectorStore = await createVectorStore(chunks);
        }
      } else {
        // Fallback to the old method if pageTexts is not available
        const chunks = parsedPDF.chunks.length > 0 
          ? parsedPDF.chunks 
          : await splitTextIntoChunks(parsedPDF.text);
        
        this.vectorStore = await createVectorStore(chunks);
      }
      
      // Initialize the chat model
      const model = new ChatOpenAI({
        modelName: 'gpt-4o',
        temperature: 0.2,
        openAIApiKey: OPENAI_API_KEY,
      });
      
      // Get a retriever from the vector store
      const retriever = this.vectorStore.asRetriever();
      
      // Create a simple chain that answers questions
      const prompt = ChatPromptTemplate.fromTemplate(`
        You are a helpful assistant that answers questions about documents.
        
        Context information from documents:
        {context}
        
        Question: {question}
        
        Please provide a helpful, concise answer based ONLY on the provided context. 
        Explain in a way that a {level} would understand.
      `);
      
      // Set up a simple chain for document QA
      this.retrievalChain = {
        async invoke({ question, level = "High Schooler" }) {
          // Get documents from retriever
          const docs = await retriever.getRelevantDocuments(question);
          
          // Format context from documents
          const context = docs.map(doc => doc.pageContent).join("\n\n");
          
          // Call the model with our prompt
          const result = await model.invoke(
            await prompt.formatMessages({
              context,
              question,
              level
            })
          );
          
          return {
            answer: result.content,
            sourceDocuments: docs
          };
        }
      };
      
      // Clear chat history
      this.chatHistory = [];
      
      return true;
    } catch (error) {
      console.error('Error initializing PDFChatService:', error);
      throw new Error('Failed to initialize PDF chat service');
    }
  }
  
  /**
   * Asks a question about the PDF
   * @param question - The question to ask
   * @param level - The explanation level (e.g., "5 y.o", "High Schooler", "Expert")
   */
  async askQuestion(
    question: string,
    level: string = "High Schooler"
  ): Promise<{ answer: string; sourceDocuments?: any[] }> {
    if (!this.vectorStore || !this.retrievalChain) {
      throw new Error('PDF Chat Service not initialized. Call initialize() first.');
    }
    
    try {
      // Add the human message to the chat history
      this.chatHistory.push(new HumanMessage(question));
      
      // Get the answer using the chain
      const response = await this.retrievalChain.invoke({
        question,
        level
      });
      
      // Extract the answer
      const answer = response.answer || 'I couldn\'t find an answer to that question in the document.';
      
      // Extract source documents if available
      const sourceDocuments = response.sourceDocuments || [];
      
      // Add the AI message to the chat history
      this.chatHistory.push(new AIMessage(answer));
      
      return { answer, sourceDocuments };
    } catch (error) {
      console.error('Error asking question:', error);
      throw new Error('Failed to process your question');
    }
  }
  
  /**
   * Gets the chat history
   */
  getChatHistory() {
    return this.chatHistory.map(msg => ({
      role: msg._getType() === 'human' ? 'user' : 'assistant',
      content: msg.content,
      // Add sourceDocuments if they exist in the message metadata
      sourceDocuments: msg.sourceDocuments || undefined
    }));
  }
  
  /**
   * Clears the chat history
   */
  clearChatHistory() {
    this.chatHistory = [];
  }
  
  /**
   * Checks if the service is initialized
   */
  isInitialized(): boolean {
    return this.vectorStore !== null && this.retrievalChain !== null;
  }
}

/**
 * Server action to initialize a new chat session
 */
export async function initializeChatSession(parsedPDF: ParsedPDF, sessionId: string): Promise<boolean> {
  try {
    const service = new PDFChatServiceImpl();
    await service.initialize(parsedPDF);
    activeSessions[sessionId] = service;
    return true;
  } catch (error) {
    console.error('Error initializing chat session:', error);
    throw new Error('Failed to initialize chat session');
  }
}

/**
 * Server action to ask a question in a chat session
 */
export async function askQuestionInSession(
  question: string, 
  sessionId: string,
  level: string = "High Schooler"
): Promise<{ answer: string; sourceDocuments?: any[] }> {
  const service = activeSessions[sessionId];
  
  if (!service) {
    throw new Error('Session not found. Please upload a PDF first.');
  }
  
  return await service.askQuestion(question, level);
}

/**
 * Server action to get chat history for a session
 */
export async function getChatHistory(sessionId: string): Promise<any[]> {
  const service = activeSessions[sessionId];
  
  if (!service) {
    return [];
  }
  
  return service.getChatHistory();
}

/**
 * Server action to clear a chat session
 */
export async function clearChatSession(sessionId: string): Promise<boolean> {
  if (activeSessions[sessionId]) {
    delete activeSessions[sessionId];
    return true;
  }
  return false;
}