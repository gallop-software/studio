/** @jsxImportSource @emotion/react */
'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { css, keyframes } from '@emotion/react'
import { colors, fontSize, fontStack, baseReset } from './tokens'

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideIn = keyframes`
  from { 
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`

const styles = {
  overlay: css`
    position: fixed;
    inset: 0;
    background-color: rgba(26, 31, 54, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: ${fadeIn} 0.15s ease-out;
    font-family: ${fontStack};
  `,
  modal: css`
    ${baseReset}
    background-color: ${colors.surface};
    border-radius: 12px;
    box-shadow: 0 30px 60px -12px rgba(50, 50, 93, 0.25), 0 18px 36px -18px rgba(0, 0, 0, 0.3);
    max-width: 600px;
    width: 90%;
    max-height: 85vh;
    animation: ${slideIn} 0.2s ease-out;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `,
  header: css`
    padding: 24px 24px 16px;
    border-bottom: 1px solid ${colors.border};
  `,
  title: css`
    font-size: ${fontSize.lg};
    font-weight: 600;
    color: ${colors.text};
    margin: 0;
    letter-spacing: -0.02em;
  `,
  body: css`
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  `,
  dropzone: css`
    border: 2px dashed ${colors.border};
    border-radius: 8px;
    padding: 40px 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.15s;
    
    &:hover {
      border-color: ${colors.primary};
      background-color: ${colors.primaryLight};
    }
  `,
  dropzoneActive: css`
    border-color: ${colors.primary};
    background-color: ${colors.primaryLight};
  `,
  dropzoneIcon: css`
    width: 48px;
    height: 48px;
    margin: 0 auto 16px;
    color: ${colors.textMuted};
  `,
  dropzoneText: css`
    font-size: ${fontSize.base};
    color: ${colors.text};
    margin: 0 0 4px;
  `,
  dropzoneHint: css`
    font-size: ${fontSize.sm};
    color: ${colors.textSecondary};
    margin: 0;
  `,
  fileInput: css`
    display: none;
  `,
  filesList: css`
    margin-top: 20px;
  `,
  filesHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  `,
  filesTitle: css`
    font-size: ${fontSize.sm};
    font-weight: 600;
    color: ${colors.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  `,
  clearBtn: css`
    font-size: ${fontSize.sm};
    color: ${colors.primary};
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    
    &:hover {
      text-decoration: underline;
    }
  `,
  fileItem: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: ${colors.background};
    border-radius: 8px;
    margin-bottom: 8px;
    
    &:last-child {
      margin-bottom: 0;
    }
  `,
  fileIcon: css`
    width: 32px;
    height: 32px;
    color: ${colors.textMuted};
    flex-shrink: 0;
  `,
  fileInfo: css`
    flex: 1;
    min-width: 0;
  `,
  fileName: css`
    font-size: ${fontSize.base};
    color: ${colors.text};
    margin: 0 0 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  filePath: css`
    font-size: ${fontSize.sm};
    color: ${colors.textSecondary};
    margin: 0;
    font-family: 'SF Mono', Monaco, 'Courier New', monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  fileWarning: css`
    font-size: ${fontSize.xs};
    color: #d97706;
    margin: 4px 0 0;
    display: flex;
    align-items: center;
    gap: 4px;
  `,
  fileActions: css`
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  `,
  editBtn: css`
    padding: 6px 12px;
    font-size: ${fontSize.sm};
    color: ${colors.primary};
    background: none;
    border: 1px solid ${colors.primary};
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
    
    &:hover {
      background: ${colors.primaryLight};
    }
  `,
  removeBtn: css`
    padding: 6px 8px;
    font-size: ${fontSize.sm};
    color: ${colors.danger};
    background: none;
    border: none;
    cursor: pointer;
    
    &:hover {
      text-decoration: underline;
    }
  `,
  instructions: css`
    margin-top: 20px;
    padding: 16px;
    background: ${colors.primaryLight};
    border-radius: 8px;
    border: 1px solid rgba(99, 91, 255, 0.2);
  `,
  instructionsTitle: css`
    font-size: ${fontSize.sm};
    font-weight: 600;
    color: ${colors.primary};
    margin: 0 0 8px;
  `,
  instructionsText: css`
    font-size: ${fontSize.sm};
    color: ${colors.text};
    margin: 0 0 8px;
    line-height: 1.5;
  `,
  instructionsCode: css`
    font-family: 'SF Mono', Monaco, 'Courier New', monospace;
    font-size: ${fontSize.xs};
    color: ${colors.textSecondary};
    background: ${colors.surface};
    padding: 8px 12px;
    border-radius: 4px;
    margin: 8px 0 0;
    display: block;
  `,
  editForm: css`
    margin-top: 12px;
    padding: 12px;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 6px;
  `,
  editRow: css`
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    
    &:last-child {
      margin-bottom: 0;
    }
  `,
  editField: css`
    flex: 1;
  `,
  editLabel: css`
    font-size: ${fontSize.xs};
    color: ${colors.textSecondary};
    margin: 0 0 4px;
    display: block;
  `,
  editInput: css`
    width: 100%;
    padding: 8px 10px;
    font-size: ${fontSize.sm};
    border: 1px solid ${colors.border};
    border-radius: 4px;
    
    &:focus {
      outline: none;
      border-color: ${colors.primary};
    }
  `,
  editSelect: css`
    width: 100%;
    padding: 8px 10px;
    font-size: ${fontSize.sm};
    border: 1px solid ${colors.border};
    border-radius: 4px;
    background: white;
    cursor: pointer;
    
    &:focus {
      outline: none;
      border-color: ${colors.primary};
    }
  `,
  editActions: css`
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 12px;
  `,
  footer: css`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid ${colors.border};
    background-color: ${colors.background};
  `,
  btn: css`
    padding: 10px 18px;
    font-size: ${fontSize.base};
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    letter-spacing: -0.01em;
  `,
  btnCancel: css`
    background-color: ${colors.surface};
    border: 1px solid ${colors.border};
    color: ${colors.text};
    
    &:hover {
      background-color: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
  `,
  btnConfirm: css`
    background-color: ${colors.primary};
    border: 1px solid ${colors.primary};
    color: white;
    
    &:hover:not(:disabled) {
      background-color: ${colors.primaryHover};
      border-color: ${colors.primaryHover};
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
}

const VALID_WEIGHTS = [
  'thin',
  'extralight',
  'light',
  'regular',
  'medium',
  'semibold',
  'bold',
  'extrabold',
  'black',
]

interface ParsedFont {
  file: File
  basename: string
  weight: string
  style: string
  isValid: boolean
  targetPath: string
}

interface FontUploadModalProps {
  onClose: () => void
  onUploadComplete: () => void
  initialFiles?: File[]
}

function parseFontFilename(filename: string): {
  basename: string
  weight: string
  style: string
  isValid: boolean
} {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.(ttf|woff2?|otf)$/i, '')
  const nameLower = nameWithoutExt.toLowerCase()

  // Check for italic
  const hasItalic = nameLower.includes('italic')
  const style = hasItalic ? 'italic' : 'normal'

  // Try to find weight by splitting on dash or underscore
  const parts = nameWithoutExt.split(/[-_]/)

  if (parts.length === 1) {
    // No separator - just basename, default to regular
    return {
      basename: nameLower.replace('italic', '').trim(),
      weight: 'regular',
      style,
      isValid: false,
    }
  }

  // First part is basename, rest is weight/style
  const basename = parts[0].toLowerCase()
  const weightPart = parts.slice(1).join('').toLowerCase().replace('italic', '')

  // Check if weight is valid
  let weight = 'regular'
  let isValid = false

  for (const validWeight of VALID_WEIGHTS) {
    if (weightPart.includes(validWeight)) {
      weight = validWeight
      isValid = true
      break
    }
  }

  // Handle common variations
  if (!isValid) {
    if (weightPart === '' || weightPart === 'regular' || weightPart === 'normal') {
      weight = 'regular'
      isValid = true
    }
  }

  return { basename, weight, style, isValid }
}

function generateTargetPath(basename: string, weight: string, style: string): string {
  const styleSuffix = style === 'italic' ? 'italic' : ''
  const filename = `${basename}-${weight}${styleSuffix}.ttf`
  return `_fonts/${basename}/${filename}`
}

export function FontUploadModal({ onClose, onUploadComplete, initialFiles }: FontUploadModalProps) {
  const [parsedFonts, setParsedFonts] = useState<ParsedFont[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editBasename, setEditBasename] = useState('')
  const [editWeight, setEditWeight] = useState('')
  const [editStyle, setEditStyle] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Parse files and set initial state
  const parseFiles = useCallback((files: File[]) => {
    const ttfFiles = files.filter(f => f.name.toLowerCase().endsWith('.ttf'))
    const parsed: ParsedFont[] = ttfFiles.map(file => {
      const { basename, weight, style, isValid } = parseFontFilename(file.name)
      return {
        file,
        basename,
        weight,
        style,
        isValid,
        targetPath: generateTargetPath(basename, weight, style),
      }
    })
    setParsedFonts(prev => [...prev, ...parsed])
  }, [])

  // Handle initial files from drag & drop
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      parseFiles(initialFiles)
    }
  }, [initialFiles, parseFiles])

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (files) {
      parseFiles(Array.from(files))
    }
  }, [parseFiles])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleRemoveFile = useCallback((index: number) => {
    setParsedFonts(prev => prev.filter((_, i) => i !== index))
    if (editingIndex === index) {
      setEditingIndex(null)
    }
  }, [editingIndex])

  const handleClearAll = useCallback(() => {
    setParsedFonts([])
    setEditingIndex(null)
  }, [])

  const handleStartEdit = useCallback((index: number) => {
    const font = parsedFonts[index]
    setEditBasename(font.basename)
    setEditWeight(font.weight)
    setEditStyle(font.style)
    setEditingIndex(index)
  }, [parsedFonts])

  const handleSaveEdit = useCallback(() => {
    if (editingIndex === null) return

    setParsedFonts(prev => prev.map((font, i) => {
      if (i === editingIndex) {
        return {
          ...font,
          basename: editBasename.toLowerCase(),
          weight: editWeight,
          style: editStyle,
          isValid: true,
          targetPath: generateTargetPath(editBasename.toLowerCase(), editWeight, editStyle),
        }
      }
      return font
    }))
    setEditingIndex(null)
  }, [editingIndex, editBasename, editWeight, editStyle])

  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null)
  }, [])

  const handleUpload = useCallback(async () => {
    if (parsedFonts.length === 0) return

    setUploading(true)

    try {
      const formData = new FormData()

      // Add all files
      parsedFonts.forEach(font => {
        formData.append('files', font.file)
      })

      // Add renames map
      const renames: Record<string, { basename: string; weight: string; style: string }> = {}
      parsedFonts.forEach(font => {
        renames[font.file.name] = {
          basename: font.basename,
          weight: font.weight,
          style: font.style,
        }
      })
      formData.append('renames', JSON.stringify(renames))

      const response = await fetch('/api/studio/fonts/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        onUploadComplete()
        onClose()
      } else {
        console.error('Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }, [parsedFonts, onClose, onUploadComplete])

  const hasInvalidFonts = parsedFonts.some(f => !f.isValid)

  return (
    <div css={styles.overlay} onClick={onClose}>
      <div css={styles.modal} onClick={e => e.stopPropagation()}>
        <div css={styles.header}>
          <h2 css={styles.title}>Upload Fonts</h2>
        </div>

        <div css={styles.body}>
          <div
            css={[styles.dropzone, isDragging && styles.dropzoneActive]}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <svg css={styles.dropzoneIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p css={styles.dropzoneText}>Drop TTF files here or click to browse</p>
            <p css={styles.dropzoneHint}>Only .ttf files are supported</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".ttf"
            multiple
            css={styles.fileInput}
            onChange={(e) => handleFileSelect(e.target.files)}
          />

          {parsedFonts.length > 0 && (
            <div css={styles.filesList}>
              <div css={styles.filesHeader}>
                <h3 css={styles.filesTitle}>Files to Upload ({parsedFonts.length})</h3>
                <button css={styles.clearBtn} onClick={handleClearAll}>Clear all</button>
              </div>

              {parsedFonts.map((font, index) => (
                <div key={index}>
                  <div css={styles.fileItem}>
                    <svg css={styles.fileIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                    <div css={styles.fileInfo}>
                      <p css={styles.fileName}>{font.file.name}</p>
                      <p css={styles.filePath}>→ {font.targetPath}</p>
                      {!font.isValid && (
                        <p css={styles.fileWarning}>
                          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Filename doesn't match convention - will default to "{font.weight}"
                        </p>
                      )}
                    </div>
                    <div css={styles.fileActions}>
                      <button css={styles.editBtn} onClick={() => handleStartEdit(index)}>
                        Rename
                      </button>
                      <button css={styles.removeBtn} onClick={() => handleRemoveFile(index)}>
                        Remove
                      </button>
                    </div>
                  </div>

                  {editingIndex === index && (
                    <div css={styles.editForm}>
                      <div css={styles.editRow}>
                        <div css={styles.editField}>
                          <label css={styles.editLabel}>Family Name (basename)</label>
                          <input
                            css={styles.editInput}
                            value={editBasename}
                            onChange={(e) => setEditBasename(e.target.value)}
                            placeholder="e.g., raleway"
                          />
                        </div>
                      </div>
                      <div css={styles.editRow}>
                        <div css={styles.editField}>
                          <label css={styles.editLabel}>Weight</label>
                          <select
                            css={styles.editSelect}
                            value={editWeight}
                            onChange={(e) => setEditWeight(e.target.value)}
                          >
                            {VALID_WEIGHTS.map(w => (
                              <option key={w} value={w}>{w}</option>
                            ))}
                          </select>
                        </div>
                        <div css={styles.editField}>
                          <label css={styles.editLabel}>Style</label>
                          <select
                            css={styles.editSelect}
                            value={editStyle}
                            onChange={(e) => setEditStyle(e.target.value)}
                          >
                            <option value="normal">normal</option>
                            <option value="italic">italic</option>
                          </select>
                        </div>
                      </div>
                      <div css={styles.editActions}>
                        <button
                          css={[styles.btn, styles.btnCancel]}
                          style={{ padding: '6px 12px', fontSize: fontSize.sm }}
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </button>
                        <button
                          css={[styles.btn, styles.btnConfirm]}
                          style={{ padding: '6px 12px', fontSize: fontSize.sm }}
                          onClick={handleSaveEdit}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {hasInvalidFonts && (
            <div css={styles.instructions}>
              <h4 css={styles.instructionsTitle}>Naming Convention</h4>
              <p css={styles.instructionsText}>
                Font files should follow this pattern: <strong>{'{family}-{weight}.ttf'}</strong>
              </p>
              <p css={styles.instructionsText}>
                Click "Rename" on any file above to set the correct family name and weight.
              </p>
              <code css={styles.instructionsCode}>
                Valid weights: thin, extralight, light, regular, medium, semibold, bold, extrabold, black
                {'\n'}Add "italic" suffix for italics: Raleway-BoldItalic.ttf
              </code>
            </div>
          )}
        </div>

        <div css={styles.footer}>
          <button css={[styles.btn, styles.btnCancel]} onClick={onClose}>
            Cancel
          </button>
          <button
            css={[styles.btn, styles.btnConfirm]}
            onClick={handleUpload}
            disabled={parsedFonts.length === 0 || uploading}
          >
            {uploading ? 'Uploading...' : `Upload ${parsedFonts.length} ${parsedFonts.length === 1 ? 'file' : 'files'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FontUploadModal
