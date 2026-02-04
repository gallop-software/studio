/** @jsxImportSource @emotion/react */
'use client'

import React, { useState, useRef, useEffect } from 'react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { css, keyframes } from '@emotion/react'
import { AlertModal } from './StudioModal'
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
  successBanner: css`
    position: absolute;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #22c55e;
    color: #fff;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: ${fontSize.sm};
    font-weight: 600;
    pointer-events: none;
    z-index: 10;
    animation: fadeInOut 3s ease-in-out forwards;
    
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translateX(-50%) scale(0.9); }
      10% { opacity: 1; transform: translateX(-50%) scale(1); }
      90% { opacity: 1; transform: translateX(-50%) scale(1); }
      100% { opacity: 0; transform: translateX(-50%) scale(0.9); }
    }
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
  subSectionLabel: css`
    font-size: ${fontSize.xs};
    font-weight: 500;
    color: ${colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
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
    
    &:hover:not(:disabled) {
      background-color: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
  aspectBtnActive: css`
    background-color: ${colors.primary};
    border-color: ${colors.primary};
    color: white;
    
    &:hover:not(:disabled) {
      background-color: ${colors.primary};
      border-color: ${colors.primary};
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
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: ${colors.surfaceHover};
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
  qualitySlider: css`
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: ${colors.border};
    outline: none;
    cursor: pointer;
    
    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: ${colors.primary};
      cursor: pointer;
    }
    
    &::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: ${colors.primary};
      cursor: pointer;
      border: none;
    }
  `,
  qualityRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  qualityValue: css`
    min-width: 40px;
    font-size: ${fontSize.sm};
    color: ${colors.text};
    text-align: right;
  `,
  fileSize: css`
    font-size: ${fontSize.sm};
    color: ${colors.textMuted};
    padding: 8px 0;
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
  clearBtn: css`
    margin-top: 8px;
    padding: 6px 12px;
    font-size: ${fontSize.xs};
    color: ${colors.textSecondary};
    background: transparent;
    border: 1px solid ${colors.border};
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    
    &:hover {
      background: ${colors.surfaceHover};
      color: ${colors.text};
    }
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

interface EditImageModalProps {
  imagePath: string
  imageSrc: string
  dimensions: { width: number; height: number }
  fileSize: number
  onClose: () => void
  onSaveComplete: (updatedItem: FileItem) => void
  triggerRefresh: () => void
}

export function EditImageModal({
  imagePath,
  imageSrc,
  dimensions,
  fileSize: initialFileSize,
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
  // Track if image was modified (rotated) so we can refresh on close
  const [wasModified, setWasModified] = useState(false)
  // Track if resize is active (different from natural)
  const resizeActive = outputWidth !== naturalSize.width || outputHeight !== naturalSize.height
  // Crop selection dimensions (in actual pixels)
  const [cropWidth, setCropWidth] = useState(0)
  const [cropHeight, setCropHeight] = useState(0)
  // Success banner after save
  const [showSuccessBanner, setShowSuccessBanner] = useState(false)
  // Key to reset banner animation when triggered multiple times
  const [bannerKey, setBannerKey] = useState(0)
  // Error message for modal display
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // Current file size (updates after edits)
  const [currentFileSize, setCurrentFileSize] = useState(initialFileSize)
  // Quality slider (0-100)
  const [quality, setQuality] = useState(95)

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
    // Can't enable crop if resize is active
    if (resizeActive) return
    
    const displayWidth = imgRef.current.width
    const displayHeight = imgRef.current.height
    
    setCropEnabled(true)
    
    // Apply aspect ratio if one is selected, otherwise use full image
    if (aspect) {
      const imgAspect = displayWidth / displayHeight
      let cropWidthPercent: number
      let cropHeightPercent: number
      
      if (aspect > imgAspect) {
        cropWidthPercent = 100
        cropHeightPercent = (imgAspect / aspect) * 100
      } else {
        cropHeightPercent = 100
        cropWidthPercent = (aspect / imgAspect) * 100
      }
      
      const newCrop: Crop = {
        unit: '%',
        x: (100 - cropWidthPercent) / 2,
        y: (100 - cropHeightPercent) / 2,
        width: cropWidthPercent,
        height: cropHeightPercent,
      }
      setCrop(newCrop)
      
      const pixelCrop: PixelCrop = {
        unit: 'px',
        x: Math.round((newCrop.x / 100) * displayWidth),
        y: Math.round((newCrop.y / 100) * displayHeight),
        width: Math.round((newCrop.width / 100) * displayWidth),
        height: Math.round((newCrop.height / 100) * displayHeight),
      }
      setCompletedCrop(pixelCrop)
    } else {
      // No aspect ratio - set initial crop to full image
      const initialCrop: Crop = {
        unit: '%',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      }
      setCrop(initialCrop)
      
      const initialPixelCrop: PixelCrop = {
        unit: 'px',
        x: 0,
        y: 0,
        width: displayWidth,
        height: displayHeight,
      }
      setCompletedCrop(initialPixelCrop)
    }
  }
  
  // Clear crop selection
  const handleClearCrop = () => {
    setCropEnabled(false)
    setCrop(undefined)
    setCompletedCrop(undefined)
  }

  // Update crop selection dimensions when crop changes
  useEffect(() => {
    if (completedCrop && imageLoaded && scale > 0) {
      // completedCrop is in displayed pixels, multiply by scale to get actual pixels
      const actualCropWidth = Math.round(completedCrop.width * scale)
      const actualCropHeight = Math.round(completedCrop.height * scale)
      setCropWidth(actualCropWidth)
      setCropHeight(actualCropHeight)
    } else if (!cropEnabled) {
      setCropWidth(0)
      setCropHeight(0)
    }
  }, [completedCrop, imageLoaded, scale, cropEnabled])

  // Rotate and save immediately
  const handleRotate = async (degrees: 90 | -90) => {
    if (rotating) return
    
    setRotating(true)
    
    try {
      // Send rotation request - full image, just rotate at max quality
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
          quality: 100,  // Always use max quality for rotation
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Update natural size (dimensions swapped)
        setNaturalSize({ width: naturalSize.height, height: naturalSize.width })
        setOutputWidth(naturalSize.height)
        setOutputHeight(naturalSize.width)
        // Update file size
        if (result.updatedItem?.size) {
          setCurrentFileSize(result.updatedItem.size)
        }
        // Reset crop
        setCropEnabled(false)
        setCrop(undefined)
        setCompletedCrop(undefined)
        // Bust cache to show rotated image
        setImageCacheBuster(Date.now())
        // Mark as modified so close will refresh detail view
        setWasModified(true)
        // Trigger refresh for file list
        triggerRefresh()
        // Show success banner for 3 seconds (reset key to restart animation)
        setBannerKey(k => k + 1)
        setShowSuccessBanner(true)
        setTimeout(() => setShowSuccessBanner(false), 3000)
      } else {
        console.error('Rotate failed:', result.error)
        setErrorMessage(result.error || 'Failed to rotate image')
      }
    } catch (error) {
      console.error('Rotate error:', error)
      setErrorMessage('An error occurred while rotating the image')
    } finally {
      setRotating(false)
    }
  }

  const handleRotateCW = () => handleRotate(90)
  const handleRotateCCW = () => handleRotate(-90)

  // Handle close - refresh detail view if image was modified
  const handleClose = () => {
    if (wasModified) {
      // Create a minimal updated item to trigger cache bust in detail view
      onSaveComplete({
        name: imagePath.split('/').pop() || '',
        path: imagePath,
        type: 'file',
        dimensions: naturalSize,
      } as FileItem)
    }
    onClose()
  }

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

  // Output size handlers - always maintain aspect ratio
  const naturalAspect = naturalSize.width / naturalSize.height

  const handleOutputWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (cropEnabled) return  // Can't resize while cropping
    const newWidth = parseInt(e.target.value) || 0
    setOutputWidth(newWidth)
    if (newWidth > 0) {
      setOutputHeight(Math.round(newWidth / naturalAspect))
    }
  }

  const handleOutputHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (cropEnabled) return  // Can't resize while cropping
    const newHeight = parseInt(e.target.value) || 0
    setOutputHeight(newHeight)
    if (newHeight > 0) {
      setOutputWidth(Math.round(newHeight * naturalAspect))
    }
  }

  const handleResetSize = () => {
    setOutputWidth(naturalSize.width)
    setOutputHeight(naturalSize.height)
  }

  // Crop dimension handlers - update the crop selection
  const handleCropWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!completedCrop || !imgRef.current) return
    const newWidth = parseInt(e.target.value) || 0
    if (newWidth <= 0) return
    
    // Calculate new height based on aspect ratio if set
    let newHeight = cropHeight
    if (aspect) {
      newHeight = Math.round(newWidth / aspect)
    }
    
    // Convert to display pixels
    const displayWidth = newWidth / scale
    const displayHeight = newHeight / scale
    
    // Keep the crop centered or at same position
    const newCrop: PixelCrop = {
      unit: 'px',
      x: completedCrop.x,
      y: completedCrop.y,
      width: displayWidth,
      height: displayHeight,
    }
    
    // Clamp to image bounds
    const maxWidth = imgRef.current.width - newCrop.x
    const maxHeight = imgRef.current.height - newCrop.y
    newCrop.width = Math.min(displayWidth, maxWidth)
    newCrop.height = Math.min(displayHeight, maxHeight)
    
    setCompletedCrop(newCrop)
    setCrop({
      unit: 'px',
      x: newCrop.x,
      y: newCrop.y,
      width: newCrop.width,
      height: newCrop.height,
    })
  }

  const handleCropHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!completedCrop || !imgRef.current) return
    const newHeight = parseInt(e.target.value) || 0
    if (newHeight <= 0) return
    
    // Calculate new width based on aspect ratio if set
    let newWidth = cropWidth
    if (aspect) {
      newWidth = Math.round(newHeight * aspect)
    }
    
    // Convert to display pixels
    const displayWidth = newWidth / scale
    const displayHeight = newHeight / scale
    
    // Keep the crop at same position
    const newCrop: PixelCrop = {
      unit: 'px',
      x: completedCrop.x,
      y: completedCrop.y,
      width: displayWidth,
      height: displayHeight,
    }
    
    // Clamp to image bounds
    const maxWidth = imgRef.current.width - newCrop.x
    const maxHeight = imgRef.current.height - newCrop.y
    newCrop.width = Math.min(displayWidth, maxWidth)
    newCrop.height = Math.min(displayHeight, maxHeight)
    
    setCompletedCrop(newCrop)
    setCrop({
      unit: 'px',
      x: newCrop.x,
      y: newCrop.y,
      width: newCrop.width,
      height: newCrop.height,
    })
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
      
      // Determine resize dimensions:
      // - If cropping: use crop dimensions (no resize, just extract)
      // - If resizing: use output dimensions
      // - Otherwise: use natural size (just applying quality)
      const resizeWidth = cropEnabled ? cropWidth : (resizeActive ? outputWidth : naturalSize.width)
      const resizeHeight = cropEnabled ? cropHeight : (resizeActive ? outputHeight : naturalSize.height)
      
      const response = await fetch('/api/studio/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePath,
          crop: actualCrop,
          rotation: 0,  // Rotation is now handled separately via instant save
          resize: {
            width: resizeWidth,
            height: resizeHeight,
          },
          quality,  // Use quality from slider
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        triggerRefresh()
        onSaveComplete(result.updatedItem)
        // Update natural size to new dimensions
        setNaturalSize({ width: result.dimensions.width, height: result.dimensions.height })
        setOutputWidth(result.dimensions.width)
        setOutputHeight(result.dimensions.height)
        // Update file size
        if (result.updatedItem?.size) {
          setCurrentFileSize(result.updatedItem.size)
        }
        // Reset crop state
        setCropEnabled(false)
        setCrop(undefined)
        setCompletedCrop(undefined)
        // Mark as modified and bust cache
        setWasModified(true)
        setImageCacheBuster(Date.now())
        // Show success banner for 3 seconds (reset key to restart animation)
        setBannerKey(k => k + 1)
        setShowSuccessBanner(true)
        setTimeout(() => setShowSuccessBanner(false), 3000)
      } else {
        console.error('Edit failed:', result.error)
        setErrorMessage(result.error || 'Failed to save image')
      }
    } catch (error) {
      console.error('Edit error:', error)
      setErrorMessage('An error occurred while saving the image')
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
            <button css={styles.closeBtn} onClick={handleClose}>
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
                {resizeActive 
                  ? 'Save resize first to enable crop' 
                  : 'Click to enable crop selection'}
              </div>
            )}
            {rotating && (
              <div css={styles.cropHint}>
                Rotating...
              </div>
            )}
            {showSuccessBanner && (
              <div key={bannerKey} css={styles.successBanner}>
                Image updated
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
            {/* Crop Selection */}
            <div css={styles.section}>
              <span css={styles.sectionLabel}>Crop Selection</span>
              
              {/* Aspect Ratio - sub-heading */}
              <span css={styles.subSectionLabel}>Aspect Ratio</span>
              <div css={styles.aspectButtons}>
                {ASPECT_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    css={[styles.aspectBtn, aspect === option.value && styles.aspectBtnActive]}
                    onClick={() => handleAspectChange(option.value)}
                    disabled={resizeActive}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              
              {/* Crop dimension inputs - only when crop is enabled */}
              {cropEnabled && (
                <>
                  <span css={styles.subSectionLabel}>Selection Size</span>
                  <div css={styles.resizeRow}>
                    <input
                      type="number"
                      css={styles.resizeInput}
                      value={cropWidth}
                      onChange={handleCropWidthChange}
                      min={1}
                    />
                    <span css={styles.resizeX}>×</span>
                    <input
                      type="number"
                      css={styles.resizeInput}
                      value={cropHeight}
                      onChange={handleCropHeightChange}
                      min={1}
                    />
                    <span css={styles.resizeX}>px</span>
                  </div>
                </>
              )}
              
              <p css={styles.hint}>
                {resizeActive 
                  ? 'Save resize first to enable crop'
                  : cropEnabled 
                    ? 'Drag corners to resize crop area' 
                    : 'Click image to enable crop'}
              </p>
              
              {cropEnabled && (
                <button 
                  css={styles.clearBtn}
                  onClick={handleClearCrop}
                >
                  Clear Selection
                </button>
              )}
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
            
            {/* Output Size - disabled when crop is enabled */}
            <div css={styles.section}>
              <span css={styles.sectionLabel}>Resize Image</span>
              <div css={styles.resizeRow}>
                <input
                  type="number"
                  css={styles.resizeInput}
                  value={outputWidth}
                  onChange={handleOutputWidthChange}
                  min={1}
                  disabled={cropEnabled}
                />
                <span css={styles.resizeX}>×</span>
                <input
                  type="number"
                  css={styles.resizeInput}
                  value={outputHeight}
                  onChange={handleOutputHeightChange}
                  min={1}
                  disabled={cropEnabled}
                />
                <span css={styles.resizeX}>px</span>
              </div>
              {resizeActive && !cropEnabled && (
                <button 
                  css={styles.clearBtn}
                  onClick={handleResetSize}
                >
                  Reset to Original
                </button>
              )}
              {cropEnabled ? (
                <p css={styles.hint}>Clear crop selection to resize</p>
              ) : resizeActive ? (
                <p css={styles.hint}>Save to apply resize, then crop</p>
              ) : (
                <p css={styles.hint}>Maintains aspect ratio</p>
              )}
            </div>
            
            {/* Quality Slider */}
            <div css={styles.section}>
              <span css={styles.sectionLabel}>Quality</span>
              <div css={styles.qualityRow}>
                <input
                  type="range"
                  css={styles.qualitySlider}
                  min={1}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                />
                <span css={styles.qualityValue}>{quality}%</span>
              </div>
              <p css={styles.hint}>Lower quality = smaller file size</p>
            </div>
            
            {/* File Size */}
            <div css={styles.section}>
              <span css={styles.sectionLabel}>File Size</span>
              <p css={styles.fileSize}>{formatFileSize(currentFileSize)}</p>
            </div>
          </div>
          
          <div css={styles.sidebarFooter}>
            <button 
              css={styles.actionBtn} 
              onClick={handleSave} 
              disabled={saving || rotating || !imageLoaded}
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
            <button css={styles.cancelBtn} onClick={handleClose} disabled={saving || rotating}>
              Close
            </button>
          </div>
        </div>
      </div>
      
      {/* Error Modal */}
      {errorMessage && (
        <AlertModal
          title="Error"
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}
    </div>
  )
}
