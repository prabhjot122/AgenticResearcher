import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Download, Edit, X, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { toast } from './ui/use-toast';
import { 
  uploadPDF, 
  getAllPDFs, 
  deletePDF, 
  updatePDFMetadata, 
  downloadPDF 
} from '../../services/api';
import { PDFDocument } from '../types';

interface PDFLibraryProps {
  onSelectPDFs?: (pdfIds: string[]) => void;
  selectedPDFs?: string[];
  selectionMode?: boolean;
}

export const PDFLibrary: React.FC<PDFLibraryProps> = ({ 
  onSelectPDFs, 
  selectedPDFs = [], 
  selectionMode = false 
}) => {
  const [pdfs, setPdfs] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPdf, setEditingPdf] = useState<PDFDocument | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');

  useEffect(() => {
    loadPDFs();
  }, []);

  const loadPDFs = async () => {
    try {
      setLoading(true);
      const response = await getAllPDFs();
      setPdfs(response.pdfs);
    } catch (error) {
      console.error('Error loading PDFs:', error);
      toast({
        title: "Error",
        description: "Failed to load PDF library",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadFile(file);
      setUploadTitle(file.name.replace('.pdf', ''));
      setShowUploadDialog(true);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a PDF file",
        variant: "destructive"
      });
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    try {
      setUploading(true);
      const tags = uploadTags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      await uploadPDF(uploadFile, uploadTitle, uploadDescription, tags);
      
      toast({
        title: "Success",
        description: "PDF uploaded successfully",
      });
      
      setShowUploadDialog(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadTags('');
      loadPDFs();
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload PDF",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (pdfId: string) => {
    if (!confirm('Are you sure you want to delete this PDF?')) return;

    try {
      await deletePDF(pdfId);
      toast({
        title: "Success",
        description: "PDF deleted successfully",
      });
      loadPDFs();
    } catch (error) {
      console.error('Error deleting PDF:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete PDF",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (pdf: PDFDocument) => {
    setEditingPdf(pdf);
    setUploadTitle(pdf.title);
    setUploadDescription(pdf.description);
    setUploadTags(pdf.tags.join(', '));
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!editingPdf) return;

    try {
      const tags = uploadTags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      await updatePDFMetadata(editingPdf.pdf_id, {
        title: uploadTitle,
        description: uploadDescription,
        tags
      });
      
      toast({
        title: "Success",
        description: "PDF updated successfully",
      });
      
      setShowEditDialog(false);
      setEditingPdf(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadTags('');
      loadPDFs();
    } catch (error) {
      console.error('Error updating PDF:', error);
      toast({
        title: "Update Error",
        description: "Failed to update PDF",
        variant: "destructive"
      });
    }
  };

  const handleDownload = (pdfId: string) => {
    const downloadUrl = downloadPDF(pdfId);
    window.open(downloadUrl, '_blank');
  };

  const handlePDFSelection = (pdfId: string) => {
    if (!selectionMode || !onSelectPDFs) return;

    const newSelection = selectedPDFs.includes(pdfId)
      ? selectedPDFs.filter(id => id !== pdfId)
      : [...selectedPDFs, pdfId];
    
    onSelectPDFs(newSelection);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">PDF Library</h2>
        <div>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="pdf-upload"
          />
          <Button onClick={() => document.getElementById('pdf-upload')?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Upload PDF
          </Button>
        </div>
      </div>

      {pdfs.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No PDFs uploaded</h3>
          <p className="text-gray-500">Upload your first PDF to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pdfs.map((pdf) => (
            <div 
              key={pdf.pdf_id} 
              className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                selectionMode && selectedPDFs.includes(pdf.pdf_id) 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200'
              }`}
              onClick={() => selectionMode && handlePDFSelection(pdf.pdf_id)}
              style={{ cursor: selectionMode ? 'pointer' : 'default' }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-red-500 mr-2" />
                  {selectionMode && (
                    <div className="mr-2">
                      {selectedPDFs.includes(pdf.pdf_id) ? (
                        <Check className="w-4 h-4 text-blue-600" />
                      ) : (
                        <div className="w-4 h-4 border border-gray-300 rounded"></div>
                      )}
                    </div>
                  )}
                </div>
                {!selectionMode && (
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(pdf)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(pdf.pdf_id)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(pdf.pdf_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              <h3 className="font-medium text-gray-100 mb-1 truncate">{pdf.title}</h3>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{pdf.description}</p>
              
              <div className="flex flex-wrap gap-1 mb-2">
                {pdf.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="text-xs text-gray-500">
                Uploaded: {formatDate(pdf.uploaded_at)}
                {pdf.metadata.chunk_count && (
                  <span className="ml-2">• {pdf.metadata.chunk_count} chunks</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Enter PDF title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Enter PDF description"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
              <Input
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="research, academic, report"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !uploadTitle.trim()}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Enter PDF title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Enter PDF description"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
              <Input
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="research, academic, report"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!uploadTitle.trim()}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
