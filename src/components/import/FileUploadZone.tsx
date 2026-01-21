import { useState, useRef, useCallback } from "react";
import { Upload, FileText, FileSpreadsheet, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  acceptedFormats?: string[];
  maxSizeMB?: number;
  selectedFile?: File | null;
  onClear?: () => void;
  isLoading?: boolean;
}

export function FileUploadZone({
  onFileSelect,
  acceptedFormats = ['.csv', '.ofx', '.qfx', '.pdf'],
  maxSizeMB = 10,
  selectedFile,
  onClear,
  isLoading = false
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    setError(null);

    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(extension)) {
      setError(`Formato não suportado. Use: ${acceptedFormats.join(', ')}`);
      return false;
    }

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Arquivo muito grande. O limite é ${maxSizeMB}MB.`);
      return false;
    }

    return true;
  }, [acceptedFormats, maxSizeMB]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  }, [onFileSelect, validateFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  }, [onFileSelect, validateFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleClear = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
    onClear?.();
  }, [onClear]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'csv') return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    if (ext === 'ofx' || ext === 'qfx') return <FileText className="h-8 w-8 text-blue-500" />;
    if (ext === 'pdf') return <FileText className="h-8 w-8 text-red-500" />;
    return <FileText className="h-8 w-8 text-muted-foreground" />;
  };

  if (selectedFile) {
    return (
      <div className="border-2 border-dashed border-primary/50 rounded-lg p-6 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getFileIcon(selectedFile.name)}
            <div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            disabled={isLoading}
            aria-label="Remover arquivo"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        isDragging 
          ? "border-primary bg-primary/10" 
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
        error && "border-destructive"
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label="Área de upload de arquivo. Clique ou arraste um arquivo para cá."
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileInput}
        className="hidden"
        aria-hidden="true"
      />

      <Upload className={cn(
        "h-12 w-12 mx-auto mb-4",
        isDragging ? "text-primary" : "text-muted-foreground"
      )} />

      <p className="text-lg font-medium mb-2">
        {isDragging ? "Solte o arquivo aqui" : "Arraste e solte seu arquivo"}
      </p>
      <p className="text-sm text-muted-foreground mb-4">
        ou clique para selecionar
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {acceptedFormats.map(format => (
          <span
            key={format}
            className="px-2 py-1 bg-muted rounded text-xs font-mono uppercase"
          >
            {format.replace('.', '')}
          </span>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Tamanho máximo: {maxSizeMB}MB
      </p>

      {error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
