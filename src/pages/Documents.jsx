import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { cogniflow } from '@/api/cogniflowClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveProject } from '@/lib/ProjectContext';
import { 
  Plus, 
  FileText, 
  Upload,
  Search,
  Filter,
  MoreVertical,
  Edit3,
  Trash2,
  Download,
  Eye,
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';

const DOCUMENT_TYPES = [
  { id: 'all', name: 'All Documents' },
  { id: 'draft', name: 'Drafts' },
  { id: 'literature', name: 'Literature' },
  { id: 'notes', name: 'Notes' },
  { id: 'reference', name: 'References' },
];

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { activeProject } = useActiveProject();

  const { data: rawDocuments = [], isLoading } = useQuery({
    queryKey: ['allDocuments', activeProject?.id],
    queryFn: () => cogniflow.entities.Document.list('-updated_date', 50),
  });
  const documents = rawDocuments.filter(d => activeProject?.id ? d.project_id === activeProject.id : !d.project_id);

  const createMutation = useMutation({
    mutationFn: (data) => cogniflow.entities.Document.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allDocuments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => cogniflow.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allDocuments'] });
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await cogniflow.integrations.Core.UploadFile({ file });
      
      // Try to extract text from PDF for word count
      let extractedData = null;
      if (file.type === 'application/pdf') {
        try {
          extractedData = await cogniflow.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: {
              type: "object",
              properties: {
                text_content: { type: "string" },
                page_count: { type: "number" }
              }
            }
          });
        } catch (_) {
          // PDF text extraction unavailable — word count will be 0
        }
      }

      const wordCount = extractedData?.output?.text_content 
        ? extractedData.output.text_content.split(/\s+/).filter(Boolean).length 
        : 0;

      await createMutation.mutateAsync({
        title: file.name.replace(/\.[^/.]+$/, ''),
        type: 'literature',
        file_url,
        word_count: wordCount,
        content: extractedData?.output?.text_content || '',
        ...(activeProject?.id ? { project_id: activeProject.id } : {}),
      });

      setUploading(false);
      setShowUploadDialog(false);
    } catch (error) {
      setUploading(false);
      alert('Upload failed. Please try again.');
    }
  };

  const filteredDocuments = documents
    .filter(d => filterType === 'all' || d.type === filterType)
    .filter(d => !searchQuery || d.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const typeColors = {
    draft: 'bg-blue-500/20 text-blue-300',
    literature: 'bg-emerald-500/20 text-emerald-300',
    notes: 'bg-amber-500/20 text-amber-300',
    reference: 'bg-violet-500/20 text-violet-300',
    submission: 'bg-rose-500/20 text-rose-300',
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Manage your research documents and files</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-gray-300">
                <Upload size={16} className="mr-2" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
              </DialogHeader>
              <div className="py-6">
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg p-8 text-center hover:border-gray-300 dark:hover:border-slate-600 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer block">
                    {uploading ? (
                      <>
                        <Loader2 size={40} className="animate-spin mx-auto text-blue-400 mb-3" />
                        <p className="text-gray-700 dark:text-slate-300 font-medium">Uploading and processing...</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">This may take a moment for large files</p>
                      </>
                    ) : (
                      <>
                        <Upload size={40} className="mx-auto text-gray-500 dark:text-slate-400 mb-3" />
                        <p className="text-gray-700 dark:text-slate-300 font-medium mb-1">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">PDF, DOC, DOCX, TXT up to 10MB</p>
                      </>
                    )}
                  </label>
                </div>
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-300">
                    💡 Tip: Uploaded PDFs will be analyzed for content and word count
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Link to={createPageUrl('Writing')}>
            <Button className="bg-gradient-to-r from-blue-500 to-cyan-600">
              <Plus size={16} className="mr-2" />
              New Document
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="pl-10 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-slate-100">
            <Filter size={14} className="mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents List */}
      {filteredDocuments.length > 0 ? (
        <div className="space-y-2">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="bg-white/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800">
                    <FileText size={20} className="text-gray-500 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">{doc.title}</h3>
                      <Badge className={typeColors[doc.type] || typeColors.notes}>
                        {doc.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-slate-400">
                      <span>{doc.word_count || 0} words</span>
                      <span>Updated {format(new Date(doc.updated_date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="text-gray-500 dark:text-slate-400">
                          <Eye size={16} />
                        </Button>
                      </a>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-gray-500 dark:text-slate-400">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit3 size={14} className="mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {doc.file_url && (
                          <DropdownMenuItem asChild>
                            <a href={doc.file_url} download>
                              <Download size={14} className="mr-2" />
                              Download
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => deleteMutation.mutate(doc.id)}
                          className="text-red-400"
                        >
                          <Trash2 size={14} className="mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <FileText size={48} className="mx-auto text-gray-400 dark:text-slate-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Documents Found</h3>
          <p className="text-gray-500 dark:text-slate-400 mb-4">
            Upload a document or create a new draft to get started
          </p>
        </div>
      )}
    </div>
  );
}
