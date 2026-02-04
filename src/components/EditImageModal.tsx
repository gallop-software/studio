/** @jsxImportSource @emotion/react */
'use client'

import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import { css, keyframes } from '@emotion/react'
import { colors, fontSize, fontStack, baseReset } from './tokens'
import type { FileItem } from '../types'

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
    background-color: rgba(26, 31, 54, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    animation: ${fadeIn} 0.15s ease-out;
    font-family: ${fontStack};
  `,
  modal: css`
    ${baseReset}
    background-color: ${colors.surface};
    border-radius: 12px;
    box-shadow: 0 30px 60px -12px rgba(50, 50, 93, 0.25), 0 18px 36px -18px rgba(0, 0, 0, 0.3);
    max-width: 800px;
    width: 95%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: ${slideIn} 0.2s ease-out;
    overflow: hidden;
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid ${colors.border};
  `,
  title: css`
    font-size: ${fontSize.lg};
    font-weight: 600;
    color: ${colors.text};
    margin: 0;
  `,
  closeBtn: css`
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: ${colors.textMuted};
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      color: ${colors.text};
      background-color: ${colors.background};
    }
  `,
  body: css`
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  `,
  cropperContainer: css`
    position: relative;
    width: 100%;
    height: 400px;
    background-color: ${colors.background};
    border-radius: 8px;
    overflow: hidden;
  `,
  controls: css`
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  controlRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  controlLabel: css`
    font-size: ${fontSize.sm};
    font-weight: 500;
    color: ${colors.text};
    min-width: 100px;
  `,
  aspectButtons: css`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  `,
  aspectBtn: css`
    padding: 6px 12px;
    font-size: ${fontSize.sm};
    border: 1px solid ${colors.border};
    background: ${colors.surface};
    color: ${colors.text};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    
    &:hover {
      background-color: ${colors.background};
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
    padding: 8px 12px;
    font-size: ${fontSize.sm};
    border: 1px solid ${colors.border};
    background: ${colors.surface};
    color: ${colors.text};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    gap: 6px;
    
    &:hover {
      background-color: ${colors.background};
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
    margin-left: 12px;
  `,
  resizeInputs: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  resizeInput: css`
    width: 80px;
    padding: 6px 10px;
    font-size: ${fontSize.sm};
    border: 1px solid ${colors.border};
    border-radius: 6px;
    background: ${colors.surface};
    color: ${colors.text};
    
    &:focus {
      outline: none;
      border-color: ${colors.primary};
    }
  `,
  resizeX: css`
    font-size: ${fontSize.sm};
    color: ${colors.textMuted};
  `,
  footer: css`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
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
  btnSave: css`
    background-color: ${colors.primary};
    border: 1px solid ${colors.primary};
    color: white;
    
    &:hover {
      background-color: ${colors.primaryHover};
      border-color: ${colors.primaryHover};
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
  saving: css`
    display: flex;
    align-items: center;
    gap: 8px;
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
}

interface AspectOption {
  label: string
  value: number | undefined // undefined = freehand
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
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [aspect, setAspect] = useState<number | undefined>(undefined)
  const [outputWidth, setOutputWidth] = useState(dimensions.width)
  const [outputHeight, setOutputHeight] = useState(dimensions.height)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
    // Update output dimensions based on crop
    setOutputWidth(Math.round(croppedAreaPixels.width))
    setOutputHeight(Math.round(croppedAreaPixels.height))
  }, [])

  const handleRotateCW = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleRotateCCW = () => {
    setRotation((prev) => (prev - 90 + 360) % 360)
  }

  const handleAspectChange = (newAspect: number | undefined) => {
    setAspect(newAspect)
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
    if (!croppedAreaPixels) return
    
    setSaving(true)
    
    try {
      const response = await fetch('/api/studio/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePath,
          crop: {
            x: Math.round(croppedAreaPixels.x),
            y: Math.round(croppedAreaPixels.y),
            width: Math.round(croppedAreaPixels.width),
            height: Math.round(croppedAreaPixels.height),
          },
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

  return (
    <div css={styles.overlay} onClick={onClose}>
      <div css={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div css={styles.header}>
          <h2 css={styles.title}>Edit Image</h2>
          <button css={styles.closeBtn} onClick={onClose}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div css={styles.body}>
          <div css={styles.cropperContainer}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          
          <div css={styles.controls}>
            <div css={styles.controlRow}>
              <span css={styles.controlLabel}>Aspect Ratio</span>
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
            </div>
            
            <div css={styles.controlRow}>
              <span css={styles.controlLabel}>Rotation</span>
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
              <span css={styles.rotationDisplay}>{rotation}°</span>
            </div>
            
            <div css={styles.controlRow}>
              <span css={styles.controlLabel}>Output Size</span>
              <div css={styles.resizeInputs}>
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
            </div>
          </div>
        </div>
        
        <div css={styles.footer}>
          <button css={[styles.btn, styles.btnCancel]} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button css={[styles.btn, styles.btnSave]} onClick={handleSave} disabled={saving}>
            {saving ? (
              <span css={styles.saving}>
                <span css={styles.spinner} />
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
