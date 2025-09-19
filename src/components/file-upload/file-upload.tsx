'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateFile } from '@/lib/s3-client'

interface FileUploadProps {
  onFileUploaded: (file: UploadedFile) => void
  context: {
    projectId?: string
    areaId?: string
    sessionId?: string
    testResultId?: string
  }
  category?: 'PHOTO' | 'IR_IMAGE' | 'NAMEPLATE' | 'DOCUMENT' | 'OTHER'
  acceptedTypes?: string[]
  maxFiles?: number
  disabled?: boolean
}

interface UploadedFile {
  id: string
  filename: string
  originalName: string
  url: string
  mimeType: string
  fileSize: number
  label?: string
  category: string
}

interface UploadingFile {
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
  label?: string
}

const CATEGORY_COLORS = {
  PHOTO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  IR_IMAGE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  NAMEPLATE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  DOCUMENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
}

export function FileUpload({
  onFileUploaded,
  context,
  category,
  acceptedTypes = ['image/*', '.pdf', '.csv', '.xlsx'],
  maxFiles = 10,
  disabled = false
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [labels, setLabels] = useState<Record<string, string>>({})

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled) return

    // Validate files
    const validFiles = acceptedFiles.filter((file, index) => {
      const validation = validateFile(file)
      if (!validation.valid) {
        // Show error for invalid files
        setUploadingFiles(prev => [...prev, {
          file,
          progress: 0,
          status: 'error',
          error: validation.error
        }])
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    // Initialize uploading state
    const initialUploading: UploadingFile[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }))

    setUploadingFiles(prev => [...prev, ...initialUploading])

    // Upload each file
    for (const uploadingFile of initialUploading) {
      try {
        await uploadFile(uploadingFile)
      } catch (error) {
        console.error('Upload failed:', error)
      }
    }
  }, [context, category, disabled])

  const uploadFile = async (uploadingFile: UploadingFile) => {
    const { file } = uploadingFile
    
    try {
      // Step 1: Get presigned upload URL
      const uploadResponse = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
          category: category,
          ...context
        })
      })

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json()
        throw new Error(error.error || 'Failed to get upload URL')
      }

      const { uploadUrl, key, publicUrl, category: detectedCategory } = await uploadResponse.json()

      // Update progress
      setUploadingFiles(prev =>
        prev.map(f => f.file === file ? { ...f, progress: 25 } : f)
      )

      // Step 2: Upload to S3
      const s3Response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      })

      if (!s3Response.ok) {
        throw new Error('Failed to upload to S3')
      }

      // Update progress
      setUploadingFiles(prev =>
        prev.map(f => f.file === file ? { ...f, progress: 75 } : f)
      )

      // Step 3: Save metadata to database
      const fileLabel = labels[file.name] || ''
      const metadataResponse = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
          category: category || detectedCategory,
          label: fileLabel,
          key,
          url: publicUrl,
          ...context
        })
      })

      if (!metadataResponse.ok) {
        const error = await metadataResponse.json()
        throw new Error(error.error || 'Failed to save file metadata')
      }

      const { file: savedFile } = await metadataResponse.json()

      // Update progress to complete
      setUploadingFiles(prev =>
        prev.map(f => f.file === file ? { ...f, progress: 100, status: 'success' } : f)
      )

      // Notify parent component
      onFileUploaded(savedFile)

      // Remove from uploading list after a delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.file !== file))
      }, 2000)

    } catch (error) {
      console.error('Upload error:', error)
      setUploadingFiles(prev =>
        prev.map(f => f.file === file ? {
          ...f,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f)
      )
    }
  }

  const updateFileLabel = (filename: string, label: string) => {
    setLabels(prev => ({ ...prev, [filename]: label }))
    setUploadingFiles(prev =>
      prev.map(f => f.file.name === filename ? { ...f, label } : f)
    )
  }

  const removeUploadingFile = (filename: string) => {
    setUploadingFiles(prev => prev.filter(f => f.file.name !== filename))
    setLabels(prev => {
      const newLabels = { ...prev }
      delete newLabels[filename]
      return newLabels
    })
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles,
    disabled,
    multiple: true
  })

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card
        {...getRootProps()}
        className={`border-2 border-dashed cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10' 
            : disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <CardContent className="p-8 text-center">
          <input {...getInputProps()} />
          <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          {isDragActive ? (
            <p className="text-blue-600 font-medium">Drop files here...</p>
          ) : disabled ? (
            <p className="text-gray-500">File upload disabled</p>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                Drag & drop files here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supports images, PDFs, and spreadsheets (max 50MB each)
              </p>
              {category && (
                <Badge className={`mt-2 ${CATEGORY_COLORS[category]}`}>
                  {category.replace('_', ' ')}
                </Badge>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Uploading Files</h4>
          {uploadingFiles.map((uploadingFile) => (
            <Card key={uploadingFile.file.name} className="bg-gray-50 dark:bg-gray-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium truncate">{uploadingFile.file.name}</h5>
                    <p className="text-sm text-gray-500">
                      {(uploadingFile.file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {uploadingFile.status === 'success' && (
                      <Badge className="bg-green-100 text-green-800">
                        ✓ Success
                      </Badge>
                    )}
                    {uploadingFile.status === 'error' && (
                      <Badge variant="destructive">
                        ✗ Error
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeUploadingFile(uploadingFile.file.name)}
                    >
                      ×
                    </Button>
                  </div>
                </div>

                {uploadingFile.status === 'uploading' && (
                  <div className="mb-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadingFile.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {uploadingFile.progress}% uploaded
                    </p>
                  </div>
                )}

                {uploadingFile.status === 'error' && uploadingFile.error && (
                  <div className="mb-3">
                    <p className="text-sm text-red-600">{uploadingFile.error}</p>
                  </div>
                )}

                {uploadingFile.status !== 'error' && (
                  <div className="space-y-2">
                    <Label htmlFor={`label-${uploadingFile.file.name}`} className="text-sm">
                      Description (optional)
                    </Label>
                    <Input
                      id={`label-${uploadingFile.file.name}`}
                      placeholder="e.g., Unit nameplate, IR image of leak..."
                      value={labels[uploadingFile.file.name] || ''}
                      onChange={(e) => updateFileLabel(uploadingFile.file.name, e.target.value)}
                      disabled={uploadingFile.status === 'uploading'}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
