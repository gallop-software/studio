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
  rotationWrapper: css`
    transition: transform 0.3s ease;
    position: relative;
    cursor: pointer;
  `,
  cropHint: css`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: ${fontSize.sm};
    pointer-events: none;
    white-space: nowrap;
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
  resizeRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  resizeInput: css`
    width: 80px;
    min-width: 0;
    padding: 8px 6px;
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
    
    /* Hide number input spinners */
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    -moz-appearance: textfield;
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
  const [aspect, setAspect] = useState<number | undefined>(undefined)
  const [outputWidth, setOutputWidth] = useState(dimensions.width)
  const [outputHeight, setOutputHeight] = useState(dimensions.height)
  const [saving, setSaving] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  // Store the actual natural size of the source image
  const [naturalSize, setNaturalSize] = useState({ width: dimensions.width, height: dimensions.height })
  // Store scale factor between displayed image and natural image
  const [scale, setScale] = useState(1)
  // Crop is hidden by default until user clicks on image
  const [cropEnabled, setCropEnabled] = useState(false)
  // Cache buster for refreshing image after rotation
  const [imageCacheBuster, setImageCacheBuster] = useState(0)

  // When image loads, calculate scale but don't set crop yet (user must click)
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const { naturalWidth, naturalHeight, width: displayWidth, height: displayHeight } = img
    
    setNaturalSize({ width: naturalWidth, height: naturalHeight })
    setScale(naturalWidth / displayWidth)
    setImageLoaded(true)
    setOutputWidth(naturalWidth)
    setOutputHeight(naturalHeight)
    
    // Don't set crop here - user must click on image to enable cropping
    // This allows rotation to be applied first without crop coordinate issues
  }

  // Enable cropping when user clicks on the image
  const handleEnableCrop = () => {
    if (!imageLoaded || !imgRef.current || cropEnabled) return
    
    const displayWidth = imgRef.current.width
    const displayHeight = imgRef.current.height
    
    setCropEnabled(true)
    
    // Set initial crop to full image
    const initialCrop: Crop = {
      unit: '%',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    }
    setCrop(initialCrop)
    
    // Also set completedCrop
    const initialPixelCrop: PixelCrop = {
      unit: 'px',
      x: 0,
      y: 0,
      width: displayWidth,
      height: displayHeight,
    }
    setCompletedCrop(initialPixelCrop)
  }

  // Update output dimensions when crop changes - calculate actual pixel values
  useEffect(() => {
    if (completedCrop && imageLoaded && scale > 0) {
      // completedCrop is in displayed pixels, multiply by scale to get actual pixels
      const actualCropWidth = Math.round(completedCrop.width * scale)
      const actualCropHeight = Math.round(completedCrop.height * scale)
      setOutputWidth(actualCropWidth)
      setOutputHeight(actualCropHeight)
    } else if (!cropEnabled && imageLoaded) {
      // No crop - use full image dimensions
      setOutputWidth(naturalSize.width)
      setOutputHeight(naturalSize.height)
    }
  }, [completedCrop, imageLoaded, scale, cropEnabled, naturalSize])

  // Rotate and save immediately
  const handleRotate = async (degrees: 90 | -90) => {
    if (rotating) return
    
    setRotating(true)
    
    try {
      // Send rotation request - full image, just rotate
      const response = await fetch('/api/studio/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePath,
          crop: { x: 0, y: 0, width: naturalSize.width, height: naturalSize.height },
          rotation: degrees === -90 ? 270 : 90,
          resize: { 
            width: naturalSize.height,  // Swapped for 90° rotation
            height: naturalSize.width 
          },
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Update natural size (dimensions swapped)
        setNaturalSize({ width: naturalSize.height, height: naturalSize.width })
        setOutputWidth(naturalSize.height)
        setOutputHeight(naturalSize.width)
        // Reset crop
        setCropEnabled(false)
        setCrop(undefined)
        setCompletedCrop(undefined)
        // Bust cache to show rotated image
        setImageCacheBuster(Date.now())
        // Trigger refresh for file list
        triggerRefresh()
      } else {
        console.error('Rotate failed:', result.error)
        alert(result.error || 'Failed to rotate image')
      }
    } catch (error) {
      console.error('Rotate error:', error)
      alert('An error occurred while rotating the image')
    } finally {
      setRotating(false)
    }
  }

  const handleRotateCW = () => handleRotate(90)
  const handleRotateCCW = () => handleRotate(-90)

  const handleAspectChange = (newAspect: number | undefined) => {
    setAspect(newAspect)
    
    if (!imageLoaded || !imgRef.current) return
    
    const displayWidth = imgRef.current.width
    const displayHeight = imgRef.current.height
    
    if (newAspect) {
      // Calculate crop with specific aspect ratio
      const imgAspect = displayWidth / displayHeight
      let cropWidthPercent: number
      let cropHeightPercent: number
      
      if (newAspect > imgAspect) {
        cropWidthPercent = 100
        cropHeightPercent = (imgAspect / newAspect) * 100
      } else {
        cropHeightPercent = 100
        cropWidthPercent = (newAspect / imgAspect) * 100
      }
      
      const newCrop: Crop = {
        unit: '%',
        x: (100 - cropWidthPercent) / 2,
        y: (100 - cropHeightPercent) / 2,
        width: cropWidthPercent,
        height: cropHeightPercent,
      }
      setCrop(newCrop)
      
      // Also set completedCrop in pixels
      const pixelCrop: PixelCrop = {
        unit: 'px',
        x: Math.round((newCrop.x / 100) * displayWidth),
        y: Math.round((newCrop.y / 100) * displayHeight),
        width: Math.round((newCrop.width / 100) * displayWidth),
        height: Math.round((newCrop.height / 100) * displayHeight),
      }
      setCompletedCrop(pixelCrop)
    } else {
      // Free aspect - set to full image
      const newCrop: Crop = {
        unit: '%',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      }
      setCrop(newCrop)
      
      // Also set completedCrop in pixels
      const pixelCrop: PixelCrop = {
        unit: 'px',
        x: 0,
        y: 0,
        width: displayWidth,
        height: displayHeight,
      }
      setCompletedCrop(pixelCrop)
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
    if (!imageLoaded) return
    
    setSaving(true)
    
    try {
      // Calculate actual crop coordinates in source image pixels
      // If crop not enabled, use full image
      const actualCrop = completedCrop ? {
        x: Math.round(completedCrop.x * scale),
        y: Math.round(completedCrop.y * scale),
        width: Math.round(completedCrop.width * scale),
        height: Math.round(completedCrop.height * scale),
      } : {
        x: 0,
        y: 0,
        width: naturalSize.width,
        height: naturalSize.height,
      }
      
      const response = await fetch('/api/studio/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePath,
          crop: actualCrop,
          rotation: 0,  // Rotation is now handled separately via instant save
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
          
          <div 
            css={styles.rotationWrapper}
            onClick={handleEnableCrop}
          >
            <ReactCrop
              crop={cropEnabled ? crop : undefined}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              css={styles.cropWrapper}
              disabled={!cropEnabled}
            >
              <img
                ref={imgRef}
                src={imageCacheBuster ? `${imageSrc}?v=${imageCacheBuster}` : imageSrc}
                alt="Edit"
                onLoad={onImageLoad}
                style={{ cursor: cropEnabled ? 'crosshair' : 'pointer' }}
              />
            </ReactCrop>
            {!cropEnabled && imageLoaded && !rotating && (
              <div css={styles.cropHint}>
                Click to enable crop selection
              </div>
            )}
            {rotating && (
              <div css={styles.cropHint}>
                Rotating...
              </div>
            )}
          </div>
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
                <button css={styles.rotateBtn} onClick={handleRotateCCW} disabled={rotating || saving}>
                  <svg css={styles.rotateIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  CCW
                </button>
                <button css={styles.rotateBtn} onClick={handleRotateCW} disabled={rotating || saving}>
                  <svg css={styles.rotateIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                  </svg>
                  CW
                </button>
              </div>
              <p css={styles.hint}>Rotates and saves immediately</p>
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
                <span css={styles.resizeX}>px</span>
              </div>
              <p css={styles.hint}>Modify to resize the output</p>
            </div>
          </div>
          
          <div css={styles.sidebarFooter}>
            <button 
              css={styles.actionBtn} 
              onClick={handleSave} 
              disabled={saving || rotating || !completedCrop}
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
            <button css={styles.cancelBtn} onClick={onClose} disabled={saving || rotating}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
