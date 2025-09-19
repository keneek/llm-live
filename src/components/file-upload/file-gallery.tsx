'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FileAsset {
  id: string
  filename: string
  originalName: string
  url: string
  mimeType: string
  fileSize: number
  label?: string
  category: string
  createdAt: string
  project?: { name: string }
  area?: { name: string }
  session?: { title: string; startedAt: string }
  testResult?: {
    testType: string
    unit?: { label: string }
  }
}

interface FileGalleryProps {
  files: FileAsset[]
  onFileUpdate?: (fileId: string, updates: { label?: string; category?: string }) => void
  onFileDelete?: (fileId: string) => void
  showActions?: boolean
  showContext?: boolean
  compact?: boolean
}

const CATEGORY_COLORS = {
  PHOTO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  IR_IMAGE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  NAMEPLATE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  DOCUMENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
}

const CATEGORY_ICONS = {
  PHOTO: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  IR_IMAGE: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  NAMEPLATE: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  DOCUMENT: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  OTHER: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  )
}

export function FileGallery({
  files,
  onFileUpdate,
  onFileDelete,
  showActions = true,
  showContext = false,
  compact = false
}: FileGalleryProps) {
  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [previewFile, setPreviewFile] = useState<FileAsset | null>(null)

  const handleEditStart = (file: FileAsset) => {
    setEditingFile(file.id)
    setEditLabel(file.label || '')
    setEditCategory(file.category)
  }

  const handleEditSave = (fileId: string) => {
    if (onFileUpdate) {
      onFileUpdate(fileId, {
        label: editLabel,
        category: editCategory
      })
    }
    setEditingFile(null)
  }

  const handleEditCancel = () => {
    setEditingFile(null)
    setEditLabel('')
    setEditCategory('')
  }

  const isImage = (mimeType: string) => mimeType.startsWith('image/')

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const openFile = (file: FileAsset) => {
    window.open(file.url, '_blank')
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p>No files uploaded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className={`grid gap-4 ${compact ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {files.map((file) => (
          <Card key={file.id} className="hover:shadow-md transition-shadow">
            <CardContent className={compact ? "p-3" : "p-4"}>
              {/* File Preview */}
              <div className="mb-3">
                {isImage(file.mimeType) ? (
                  <div 
                    className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => openFile(file)}
                  >
                    <img
                      src={file.url}
                      alt={file.originalName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity"></div>
                  </div>
                ) : (
                  <div 
                    className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => openFile(file)}
                  >
                    <div className="text-center">
                      <div className="mx-auto mb-2 text-gray-400">
                        {CATEGORY_ICONS[file.category as keyof typeof CATEGORY_ICONS] || CATEGORY_ICONS.OTHER}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                        {file.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>
                      {file.originalName}
                    </h4>
                    <p className={`text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>
                      {formatFileSize(file.fileSize)}
                    </p>
                  </div>
                  <Badge className={`${CATEGORY_COLORS[file.category as keyof typeof CATEGORY_COLORS]} text-xs`}>
                    {file.category.replace('_', ' ')}
                  </Badge>
                </div>

                {/* File Label */}
                {editingFile === file.id ? (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder="File description..."
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Category</Label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      >
                        <option value="PHOTO">Photo</option>
                        <option value="IR_IMAGE">IR Image</option>
                        <option value="NAMEPLATE">Nameplate</option>
                        <option value="DOCUMENT">Document</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => handleEditSave(file.id)} className="h-7 text-xs">
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleEditCancel} className="h-7 text-xs">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {file.label && (
                      <p className={`text-gray-600 dark:text-gray-300 ${compact ? 'text-xs' : 'text-sm'}`}>
                        {file.label}
                      </p>
                    )}

                    {showContext && (
                      <div className={`space-y-1 ${compact ? 'text-xs' : 'text-sm'} text-gray-500`}>
                        {file.testResult && (
                          <div>
                            Test: {file.testResult.testType.replace('_', ' ')}
                            {file.testResult.unit && ` (${file.testResult.unit.label})`}
                          </div>
                        )}
                        {file.session && (
                          <div>Session: {file.session.title || 'Untitled'}</div>
                        )}
                        {file.area && <div>Area: {file.area.name}</div>}
                        {file.project && <div>Project: {file.project.name}</div>}
                      </div>
                    )}

                    <p className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>
                      {new Date(file.createdAt).toLocaleDateString()}
                    </p>

                    {showActions && (
                      <div className="flex gap-1 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openFile(file)}
                          className="h-7 text-xs flex-1"
                        >
                          View
                        </Button>
                        {onFileUpdate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditStart(file)}
                            className="h-7 text-xs flex-1"
                          >
                            Edit
                          </Button>
                        )}
                        {onFileDelete && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onFileDelete(file.id)}
                            className="h-7 text-xs text-red-600 hover:text-red-700"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-full overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-medium">{previewFile.originalName}</h3>
              <Button variant="outline" onClick={() => setPreviewFile(null)}>
                Close
              </Button>
            </div>
            <div className="p-4">
              {isImage(previewFile.mimeType) ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.originalName}
                  className="max-w-full max-h-96 mx-auto"
                />
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">Preview not available for this file type</p>
                  <Button onClick={() => openFile(previewFile)}>
                    Open File
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
