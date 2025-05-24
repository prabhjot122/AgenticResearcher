export interface LibraryItem {
  id: string;
  title: string;
  category: string;
  content: string;
  timestamp: number;
  references?: string[];
  researchId?: string;
}

export interface PDFDocument {
  pdf_id: string;
  filename: string;
  title: string;
  description: string;
  file_path: string;
  uploaded_at: string;
  tags: string[];
  metadata: {
    original_filename: string;
    chunk_count?: number;
  };
}

export interface PDFUploadResponse {
  status: string;
  message: string;
  pdf_id: string;
  title: string;
  chunk_count?: number;
}

export interface PDFLibraryResponse {
  count: number;
  pdfs: PDFDocument[];
}
