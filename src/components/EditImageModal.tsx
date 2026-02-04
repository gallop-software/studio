/** @jsxImportSource @emotion/react */
'use client'

import React, { useState, useRef, useEffect } from 'react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { css, keyframes } from '@emotion/react'
import { colors, fontSize, fontStack, baseReset } from './tokens'
import type { FileItem } from '../types'

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const styles = {
  overlay: css`
    position: fixed;
    inset: 0;
    z-index: 10001;
    display: flex;
    background: transparent;
    animation: ${fadeIn} 0.15s ease-out;
    font-family: ${fontStack};
  `,
  container: css`
    ${baseReset}
    display: flex;
    flex: 1;
    margin: 24px;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  `,
  main: css`
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: ${colors.background};
    overflow: hidden;
    
    .ReactCrop__crop-selection {
      border: 2px solid ${colors.primary};
    }
  `,
  headerButtons: css`
    position: absolute;
    top: 16px;
    right: 16px;
    display: flex;
    gap: 8px;
    z-index: 10;
  `,
  closeBtn: css`
    padding: 8px;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    
    &:hover {
      background-color: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
  `,
  closeIcon: css`
    width: 20px;
    height: 20px;
    color: ${colors.textSecondary};
  `,
  cropWrapper: css`
    max-width: 100%;
    max-height: calc(100vh - 150px);
    
    img {
      max-width: 100%;
      max-height: calc(100vh - 150px);
      display: block;
    }
  `,
  sidebar: css`
    width: 280px;
    background: ${colors.surface};
    border-left: 1px solid ${colors.border};
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `,
  sidebarHeader: css`
    padding: 16px 20px;
    border-bottom: 1px solid ${colors.border};
  `,
  sidebarTitle: css`
    font-size: ${fontSize.base};
    font-weight: 600;
    color: ${colors.text};
    margin: 0;
  `,
  sidebarContent: css`
    flex: 1;
    padding: 20px;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  `,
  section: css`
    display: flex;
    flex-direction: column;
    gap: 10px;
  `,
  sectionLabel: css`
    font-size: ${fontSize.sm};
    font-weight: 600;
    color: ${colors.text};
  `,
  aspectButtons: css`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  `,
  aspectBtn: css`
    padding: 6px 10px;
    font-size: ${fontSize.sm};
    border: 1px solid ${colors.border};
    background: ${colors.surface};
    color: ${colors.text};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    
    &:hover {
      background-color: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
  `,
  aspectBtnActive: css`
    background-color: ${colors.primary};
    border-color: ${colors.primary};
    color: white;
    
    &:hover {
      background-color: ${colors.primaryHover};
      border-color: ${colors.primaryHover};
    }
  `,
  rotateButtons: css`
    display: flex;
    gap: 8px;
  `,
  rotateBtn: css`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 12px;
    font-size: ${fontSize.sm};
    font-weight: 500;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    color: ${colors.text};
    
    &:hover {
      background-color: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
  `,
  rotateIcon: css`
    width: 16px;
    height: 16px;
  `,
  rotationDisplay: css`
    font-size: ${fontSize.sm};
    color: ${colors.textSecondary};
    text-align: center;
  `,
  infoRow: css`
    display: flex;
    justify-content: space-between;
    font-size: ${fontSize.sm};
  `,
  infoLabel: css`
    color: ${colors.textSecondary};
  `,
  infoValue: css`
    color: ${colors.text};
    font-weight: 500;
  `,
  resizeRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  resizeInput: css`
    flex: 1;
    padding: 8px 10px;
    font-size: ${fontSize.sm};
    border: 1px solid ${colors.border};
    border-radius: 6px;
    background: ${colors.surface};
    color: ${colors.text};
    text-align: center;
    
    &:focus {
      outline: none;
      border-color: ${colors.primary};
    }
  `,
  resizeX: css`
    font-size: ${fontSize.sm};
    color: ${colors.textMuted};
  `,
  sidebarFooter: css`
    padding: 16px 20px;
    border-top: 1px solid ${colors.border};
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  actionBtn: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 12px 14px;
    font-size: ${fontSize.base};
    font-weight: 500;
    background: ${colors.primary};
    border: 1px solid ${colors.primary};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    color: white;
    
    &:hover:not(:disabled) {
      background-color: ${colors.primaryHover};
      border-color: ${colors.primaryHover};
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
  cancelBtn: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 12px 14px;
    font-size: ${fontSize.base};
    font-weight: 500;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    color: ${colors.text};
    
    &:hover {
      background-color: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
  `,
  spinner: css`
    width: 16px;
    height: 16px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `,
  hint: css`
    font-size: ${fontSize.xs};
    color: ${colors.textMuted};
    font-style: italic;
  `,
}

interface AspectOption {
  label: string
  value: number | undefined
}

const ASPECT_OPTIONS: AspectOption[] = [
  { label: 'Free', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '2:3', value: 2 / 3 },
  { label: '9:16', value: 9 / 16 },
]

interface EditImageModalProps {
  imagePath: string
  imageSrc: string
  dimensions: { width: number; height: number }
  onClose: () => void
  onSaveComplete: (updatedItem: FileItem) => void
  triggerRefresh: () => void
}

export function EditImageModal({
  imagePath,
  imageSrc,
  dimensions,
  onClose,
  onSaveComplete,
  triggerRefresh,
}: EditImageModalProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [rotation, setRotation] = useState(0)
  const [aspect, setAspect] = useState<number | undefined>(undefined)
  const [outputWidth, setOutputWidth] = useState(dimensions.width)
  const [outputHeight, setOutputHeight] = useState(dimensions.height)
  const [saving, setSaving] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  // Store the actual natural size of the source image
  const [naturalSize, setNaturalSize] = useState({ width: dimensions.width, height: dimensions.height })
  // Store scale factor between displayed image and natural image
  const [scale, setScale] = useState(1)

  // When image loads, set initial crop to full image and calculate scale
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const { naturalWidth, naturalHeight, width: displayWidth } = img
    
    setNaturalSize({ width: naturalWidth, height: naturalHeight })
    setScale(naturalWidth / displayWidth)
    setImageLoaded(true)
    setOutputWidth(naturalWidth)
    setOutputHeight(naturalHeight)
    
    // Set initial crop to full image
    const initialCrop: Crop = {
      unit: '%',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    }
    setCrop(initialCrop)
  }

  // Update output dimensions when crop changes - calculate actual pixel values
  useEffect(() => {
    if (completedCrop && imageLoaded && scale > 0) {
      // completedCrop is in displayed pixels, multiply by scale to get actual pixels
      const actualCropWidth = Math.round(completedCrop.width * scale)
      const actualCropHeight = Math.round(completedCrop.height * scale)
      setOutputWidth(actualCropWidth)
      setOutputHeight(actualCropHeight)
    }
  }, [completedCrop, imageLoaded, scale])

  const handleRotateCW = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleRotateCCW = () => {
    setRotation((prev) => (prev - 90 + 360) % 360)
  }

  const handleAspectChange = (newAspect: number | undefined) => {
    setAspect(newAspect)
    
    // Reset crop when aspect changes
    if (newAspect && imageLoaded) {
      const imgAspect = naturalSize.width / naturalSize.height
      let cropWidth: number
      let cropHeight: number
      
      if (newAspect > imgAspect) {
        cropWidth = 100
        cropHeight = (imgAspect / newAspect) * 100
      } else {
        cropHeight = 100
        cropWidth = (newAspect / imgAspect) * 100
      }
      
      setCrop({
        unit: '%',
        x: (100 - cropWidth) / 2,
        y: (100 - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight,
      })
    }
  }

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value) || 0
    setOutputWidth(newWidth)
    if (aspect && newWidth > 0) {
      setOutputHeight(Math.round(newWidth / aspect))
    }
  }

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = parseInt(e.target.value) || 0
    setOutputHeight(newHeight)
    if (aspect && newHeight > 0) {
      setOutputWidth(Math.round(newHeight * aspect))
    }
  }

  const handleSave = async () => {
    if (!completedCrop || !imageLoaded) return
    
    setSaving(true)
    
    try {
      // Calculate actual crop coordinates in source image pixels
      const actualCrop = {
        x: Math.round(completedCrop.x * scale),
        y: Math.round(completedCrop.y * scale),
        width: Math.round(completedCrop.width * scale),
        height: Math.round(completedCrop.height * scale),
      }
      
      const response = await fetch('/api/studio/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePath,
          crop: actualCrop,
          rotation,
          resize: {
            width: outputWidth,
            height: outputHeight,
          },
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        triggerRefresh()
        onSaveComplete(result.updatedItem)
        onClose()
      } else {
        console.error('Edit failed:', result.error)
        alert(result.error || 'Failed to save image')
      }
    } catch (error) {
      console.error('Edit error:', error)
      alert('An error occurred while saving the image')
    } finally {
      setSaving(false)
    }
  }

  // Calculate crop dimensions for display
  const cropWidth = completedCrop ? Math.round(completedCrop.width * scale) : naturalSize.width
  const cropHeight = completedCrop ? Math.round(completedCrop.height * scale) : naturalSize.height

  return (
    <div css={styles.overlay}>
      <div css={styles.container}>
        {/* Main area - Image cropper */}
        <div css={styles.main}>
          <div css={styles.headerButtons}>
            <button css={styles.closeBtn} onClick={onClose}>
              <svg css={styles.closeIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            css={styles.cropWrapper}
            style={{ 
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease',
            }}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Edit"
              onLoad={onImageLoad}
            />
          </ReactCrop>
        </div>
        
        {/* Sidebar */}
        <div css={styles.sidebar}>
          <div css={styles.sidebarHeader}>
            <h2 css={styles.sidebarTitle}>Edit Image</h2>
          </div>
          
          <div css={styles.sidebarContent}>
            {/* Aspect Ratio */}
            <div css={styles.section}>
              <span css={styles.sectionLabel}>Aspect Ratio</span>
              <div css={styles.aspectButtons}>
                {ASPECT_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    css={[styles.aspectBtn, aspect === option.value && styles.aspectBtnActive]}
                    onClick={() => handleAspectChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p css={styles.hint}>Drag corners to resize crop area</p>
            </div>
            
            {/* Rotation */}
            <div css={styles.section}>
              <span css={styles.sectionLabel}>Rotation</span>
              <div css={styles.rotateButtons}>
                <button css={styles.rotateBtn} onClick={handleRotateCCW}>
                  <svg css={styles.rotateIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  CCW
                </button>
                <button css={styles.rotateBtn} onClick={handleRotateCW}>
                  <svg css={styles.rotateIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                  </svg>
                  CW
                </button>
              </div>
              <p css={styles.rotationDisplay}>{rotation}°</p>
            </div>
            
            {/* Crop Info */}
            <div css={styles.section}>
              <span css={styles.sectionLabel}>Crop Selection</span>
              <div css={styles.infoRow}>
                <span css={styles.infoLabel}>Size</span>
                <span css={styles.infoValue}>{cropWidth} × {cropHeight} px</span>
              </div>
            </div>
            
            {/* Output Size */}
            <div css={styles.section}>
              <span css={styles.sectionLabel}>Output Size</span>
              <div css={styles.resizeRow}>
                <input
                  type="number"
                  css={styles.resizeInput}
                  value={outputWidth}
                  onChange={handleWidthChange}
                  min={1}
                />
                <span css={styles.resizeX}>×</span>
                <input
                  type="number"
                  css={styles.resizeInput}
                  value={outputHeight}
                  onChange={handleHeightChange}
                  min={1}
                />
              </div>
              <p css={styles.hint}>Modify to resize the output</p>
            </div>
          </div>
          
          <div css={styles.sidebarFooter}>
            <button 
              css={styles.actionBtn} 
              onClick={handleSave} 
              disabled={saving || !completedCrop}
            >
              {saving ? (
                <>
                  <span css={styles.spinner} />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
            <button css={styles.cancelBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
