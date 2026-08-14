import { useCallback, useState } from 'react'
import { type FileRejection, useDropzone } from 'react-dropzone'
import { CloudUpload, File as FileIcon, Loader2, X } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from '~/components/ui/alert'
import { cn } from '~/lib/utils'
import { useApi } from '~/hooks/use_api'
import type { FileUploadResponse } from '~/types'

const ACCEPTED_FILE_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'audio/mpeg': ['.mp3'],
  'video/mp4': ['.mp4'],
  'application/zip': ['.zip'],
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function FileUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedFile, setUploadedFile] = useState<FileUploadResponse | null>(null)
  const [rejectionError, setRejectionError] = useState<string | null>(null)
  const { client, loading, error, request, clearError } = useApi()

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      clearError()
      setUploadedFile(null)

      if (fileRejections.length > 0) {
        const firstError = fileRejections[0]?.errors[0]
        if (firstError?.code === 'file-too-large') {
          setRejectionError(`Arquivo muito grande. O limite é ${formatFileSize(MAX_FILE_SIZE)}.`)
        } else if (firstError?.code === 'file-invalid-type') {
          setRejectionError('Tipo de arquivo não suportado.')
        } else {
          setRejectionError(firstError?.message ?? 'Não foi possível aceitar o arquivo.')
        }
        return
      }

      const file = acceptedFiles[0]
      if (file) {
        setRejectionError(null)
        setSelectedFile(file)
      }
    },
    [clearError]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: loading,
  })

  const handleUpload = async () => {
    if (!selectedFile) return

    const result = await request<FileUploadResponse>(() =>
      client.upload('/files/upload', selectedFile)
    )

    if (result) {
      setUploadedFile(result)
      setSelectedFile(null)
    }
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setRejectionError(null)
    clearError()
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-[#f7f8f9] px-6 py-12 text-center transition-colors',
          loading
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:border-[#1cd6f4] hover:bg-cyan-50/40',
          isDragActive && 'border-[#1cd6f4] bg-cyan-50'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex size-12 items-center justify-center rounded-full bg-cyan-50 text-[#00b8d9]">
          <CloudUpload className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Arraste o arquivo aqui ou clique para escolher
          </p>
          <p className="text-xs text-muted-foreground">
            Imagens, PDFs e documentos de até {formatFileSize(MAX_FILE_SIZE)}
          </p>
        </div>
      </div>

      {selectedFile && (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-[#f7f8f9] p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
            <FileIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            mode="icon"
            size="sm"
            onClick={clearSelection}
            disabled={loading}
            aria-label="Remover arquivo selecionado"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="primary"
          onClick={handleUpload}
          disabled={!selectedFile || loading}
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {loading ? 'Enviando...' : 'Enviar arquivo'}
        </Button>
      </div>

      {rejectionError && (
        <Alert variant="destructive" appearance="light">
          <AlertIcon>
            <X className="size-4" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>Arquivo rejeitado</AlertTitle>
            <AlertDescription>{rejectionError}</AlertDescription>
          </AlertContent>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" appearance="light">
          <AlertIcon>
            <X className="size-4" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>Falha no envio</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </AlertContent>
        </Alert>
      )}

      {uploadedFile && (
        <Alert variant="success" appearance="light">
          <AlertIcon>
            <CloudUpload className="size-4" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>Arquivo enviado</AlertTitle>
            <AlertDescription>
              <div className="mt-1 space-y-1">
                <p>
                  <strong>Arquivo:</strong> {uploadedFile.clientName}
                </p>
                <p>
                  <strong>Tipo:</strong> {uploadedFile.fileType}
                </p>
                <p>
                  <strong>Tamanho:</strong> {formatFileSize(uploadedFile.size)}
                </p>
                <p className="truncate">
                  <strong>URL:</strong>{' '}
                  <a
                    href={uploadedFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    {uploadedFile.url}
                  </a>
                </p>
              </div>
            </AlertDescription>
          </AlertContent>
        </Alert>
      )}
    </div>
  )
}

export default FileUpload
