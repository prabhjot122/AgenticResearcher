// API service for communicating with the DeepWebResearcher backend

const API_BASE_URL = 'http://127.0.0.1:5000'; // Updated to match the port in app.py

import { PDFDocument, PDFUploadResponse, PDFLibraryResponse } from '../src/types';

export interface ResearchResponse {
  research_id: string;
  status: string;
  message: string;
  research_status: string;
  created_at: string;
}

export interface ResearchResult {
  research_id: string;
  status: string;
  created_at: string;
  completed_at?: string;
  query: {
    original: string;
    optimized: string;
  };
  research_output: string;
  fact_check: {
    report: string;
    verification_results: any[];
  };
  content: {
    style: string;
    draft: string;
  };
  references: string[];
  pdf_ids?: string[];
}

export interface SavedDraft {
  draft_id: string;
  title: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  research_id: string;
  query: string;
  content_style: string;
  draft_content: string;
  references: string[];
}

// Start a new research
export const startResearch = async (
  query: string,
  style: number,
  pdfIds: string[] = []
): Promise<ResearchResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/research/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        style,
        pdf_ids: pdfIds
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to start research');
    }

    return await response.json();
  } catch (error) {
    console.error('Error starting research:', error);
    throw error;
  }
};

// Get research results
export const getResearchResults = async (researchId: string): Promise<ResearchResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/research/results/${researchId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get research results');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting research results:', error);
    throw error;
  }
};

// Save draft to library
export const saveDraftToLibrary = async (
  researchId: string,
  title: string,
  tags: string[] = [],
  content?: string
): Promise<{ draft_id: string }> => {
  try {
    console.log("API: Saving draft with research ID:", researchId);
    console.log("API: Content length:", content?.length);

    const requestBody: any = {
      research_id: researchId,
      title,
      tags
    };

    // Only include content if it's provided
    if (content !== undefined) {
      requestBody.content = content;
    }

    const response = await fetch(`${API_BASE_URL}/library/save-draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save draft');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving draft:', error);
    throw error;
  }
};

// Save a copy of an existing draft with edited content
export const saveDraftCopy = async (
  title: string,
  content: string,
  contentStyle: string,
  tags: string[] = [],
  references: string[] = []
): Promise<{ draft_id: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/library/save-copy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        content,
        content_style: contentStyle,
        tags,
        references
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save draft copy');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving draft copy:', error);
    throw error;
  }
};

// Get all drafts
export const getAllDrafts = async (): Promise<{ drafts: SavedDraft[] }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/library/drafts`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get drafts');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting drafts:', error);
    throw error;
  }
};

// Get draft by ID
export const getDraftById = async (draftId: string): Promise<SavedDraft> => {
  try {
    const response = await fetch(`${API_BASE_URL}/library/drafts/${draftId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get draft');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting draft:', error);
    throw error;
  }
};

// PDF Management APIs

// Upload a PDF file
export const uploadPDF = async (
  file: File,
  title?: string,
  description?: string,
  tags: string[] = []
): Promise<PDFUploadResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    if (title) formData.append('title', title);
    if (description) formData.append('description', description);
    formData.append('tags', JSON.stringify(tags));

    const response = await fetch(`${API_BASE_URL}/pdfs/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload PDF');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
};

// Get all PDFs
export const getAllPDFs = async (tag?: string): Promise<PDFLibraryResponse> => {
  try {
    const url = tag ?
      `${API_BASE_URL}/pdfs?tag=${encodeURIComponent(tag)}` :
      `${API_BASE_URL}/pdfs`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get PDFs');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting PDFs:', error);
    throw error;
  }
};

// Get PDF by ID
export const getPDFById = async (pdfId: string): Promise<PDFDocument> => {
  try {
    const response = await fetch(`${API_BASE_URL}/pdfs/${pdfId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get PDF');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting PDF:', error);
    throw error;
  }
};

// Delete PDF
export const deletePDF = async (pdfId: string): Promise<{ status: string; message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/pdfs/${pdfId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete PDF');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting PDF:', error);
    throw error;
  }
};

// Update PDF metadata
export const updatePDFMetadata = async (
  pdfId: string,
  updates: { title?: string; description?: string; tags?: string[] }
): Promise<{ status: string; message: string; pdf: PDFDocument }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/pdfs/${pdfId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update PDF');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating PDF:', error);
    throw error;
  }
};

// Download PDF
export const downloadPDF = (pdfId: string): string => {
  return `${API_BASE_URL}/pdfs/${pdfId}/download`;
};

// Query PDFs directly
export const queryPDFs = async (
  query: string,
  pdfIds: string[] = []
): Promise<{ status: string; query: string; answer: string; sources: any[] }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/query-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, pdf_ids: pdfIds }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to query PDFs');
    }

    return await response.json();
  } catch (error) {
    console.error('Error querying PDFs:', error);
    throw error;
  }
};
