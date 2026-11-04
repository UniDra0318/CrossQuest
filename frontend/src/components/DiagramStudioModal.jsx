import React, { useState } from 'react';
import {
  X,
  Check,
  Plus,
  Trash2,
  Sparkles,
  Eye,
  Maximize2,
  Award,
  Key,
  Shield,
  Layers,
  Cloud,
  Lock,
  ArrowRight,
  ChevronDown,
  GitBranch
} from 'lucide-react';
import QuizDiagram, { AVAILABLE_DIAGRAM_ICONS, renderDiagramNodeIcon } from './QuizDiagram';

export default function DiagramStudioModal({
  isOpen,
  onClose,
  templates = [],
  diagramTemplateId,
  onSelectTemplate,
  customDiagramTitle,
  onChangeTitle,
  customLayout,
  onChangeLayout,
  customNodes = [],
  onAddNode,
  onRemoveNode,
  onMoveNode,
  onUpdateNode,
  hotspotTarget,
  onSelectTarget,
  isDark = true,
  readOnly = false
}) {
  const [openIconPickerNodeId, setOpenIconPickerNodeId] = useState(null);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'archetypes'

  if (!isOpen) return null;

  const currentTemplate = templates.find(t => t.id === diagramTemplateId) || templates[0] || {};
  const colors = [
    { id: 'cyan', hex: '#06b6d4', label: 'Cyan' },
    { id: 'purple', hex: '#8b5cf6', label: 'Purple' },
    { id: 'emerald', hex: '#10b981', label: 'Emerald' },
    { id: 'gold', hex: '#f59e0b', label: 'Gold' },
    { id: 'rose', hex: '#f43f5e', label: 'Rose' },
    { id: 'blue', hex: '#3b82f6', label: 'Blue' }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 8, 17, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '95vw',
          maxWidth: '1280px',
          height: '90vh',
          maxHeight: '900px',
          background: isDark ? '#0b0f19' : '#ffffff',
          border: isDark ? '1.5px solid rgba(255, 255, 255, 0.14)' : '1.5px solid #cbd5e1',
          borderRadius: '20px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* =========================================================================
            MODAL HEADER
            ========================================================================= */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
            background: isDark ? '#111827' : '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                  Architectural Diagram Studio
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'rgba(139, 92, 246, 0.18)',
                    color: '#c4b5fd',
                    fontWeight: 700,
                    border: '1px solid rgba(139, 92, 246, 0.3)'
                  }}
                >
                  {currentTemplate.name || 'Architecture'}
                </span>
              </div>
              <span style={{ fontSize: '11.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
                {readOnly ? 'Fullscreen Architectural Diagram Viewer' : 'Edit objects, change icons & layers, pick hotspot targets, and inspect live preview.'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!readOnly && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                }}
              >
                <Check size={14} />
                <span>Apply to Question</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              title="Close window"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1',
                background: 'transparent',
                color: isDark ? '#94a3b8' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* =========================================================================
            MODAL BODY (2-Column Split Workspace)
            ========================================================================= */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* LEFT COLUMN: Controls & Objects Studio (Only in Edit mode) */}
          {!readOnly && (
            <div
              style={{
                width: '440px',
                borderRight: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                background: isDark ? '#0b0f19' : '#f8fafc'
              }}
            >
              {/* Studio Tabs */}
              <div
                style={{
                  padding: '10px 16px',
                  borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                  display: 'flex',
                  gap: '8px',
                  background: isDark ? '#111827' : '#f1f5f9'
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: activeTab === 'editor' ? (isDark ? '#1e1b4b' : '#ffffff') : 'transparent',
                    color: activeTab === 'editor' ? '#a5b4fc' : (isDark ? '#94a3b8' : '#64748b'),
                    boxShadow: activeTab === 'editor' ? '0 2px 6px rgba(0, 0, 0, 0.15)' : 'none'
                  }}
                >
                  Objects & Layers ({customNodes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('archetypes')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: activeTab === 'archetypes' ? (isDark ? '#1e1b4b' : '#ffffff') : 'transparent',
                    color: activeTab === 'archetypes' ? '#a5b4fc' : (isDark ? '#94a3b8' : '#64748b'),
                    boxShadow: activeTab === 'archetypes' ? '0 2px 6px rgba(0, 0, 0, 0.15)' : 'none'
                  }}
                >
                  Archetypes ({templates.length})
                </button>
              </div>

              {/* Scrollable controls panel */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* ARCHETYPES TAB */}
                {activeTab === 'archetypes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase' }}>
                      Select Architectural Archetype:
                    </span>
                    {templates.map((tmpl) => {
                      const isSelected = diagramTemplateId === tmpl.id;
                      return (
                        <div
                          key={tmpl.id}
                          onClick={() => {
                            if (onSelectTemplate) onSelectTemplate(tmpl);
                            // Keep on archetypes tab when switching diagrams per user request
                          }}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '12px',
                            border: isSelected
                              ? '2px solid #8b5cf6'
                              : (isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #cbd5e1'),
                            background: isSelected
                              ? (isDark ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.22) 0%, rgba(30, 27, 75, 0.7) 100%)' : '#faf5ff')
                              : (isDark ? '#111827' : '#ffffff'),
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '12.5px', color: isSelected ? '#a5b4fc' : (isDark ? '#f8fafc' : '#1e293b') }}>
                              {tmpl.name}
                            </strong>
                            <span className={`adm-chip ${tmpl.tagColor}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                              {tmpl.badge}
                            </span>
                          </div>
                          <span style={{ fontSize: '10.5px', color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.3 }}>
                            {tmpl.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* OBJECTS & LAYERS TAB */}
                {activeTab === 'editor' && (
                  <>
                    {/* Diagram Title */}
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                        Diagram Title Banner:
                      </label>
                      <input
                        type="text"
                        value={customDiagramTitle || ''}
                        placeholder="e.g. Tiered Hierarchy Pyramid"
                        onChange={(e) => onChangeTitle && onChangeTitle(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1',
                          background: isDark ? '#111827' : '#ffffff',
                          color: isDark ? '#f8fafc' : '#1e293b',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Action Bar: Layout toggle (Vertical vs Horizontal) + Add Object */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          background: isDark ? '#0b0f19' : '#e2e8f0',
                          padding: '3px',
                          borderRadius: '8px',
                          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #cbd5e1'
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => onChangeLayout && onChangeLayout('hierarchy')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: customLayout === 'hierarchy' ? '#8b5cf6' : 'transparent',
                            color: customLayout === 'hierarchy' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                            fontSize: '11px',
                            fontWeight: customLayout === 'hierarchy' ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          title="Vertical Hierarchy (Top-to-Bottom Layout)"
                        >
                          <span>📐 Vertical</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onChangeLayout && onChangeLayout('pipeline')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: customLayout === 'pipeline' ? '#8b5cf6' : 'transparent',
                            color: customLayout === 'pipeline' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                            fontSize: '11px',
                            fontWeight: customLayout === 'pipeline' ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          title="Horizontal Flow (Left-to-Right Layout)"
                        >
                          <span>➡️ Horizontal</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={onAddNode}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: '#8b5cf6',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={13} />
                        <span>Add Object</span>
                      </button>
                    </div>

                    {/* Nodes Customization Cards List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {customNodes.map((node, nIdx) => {
                        const isNodeTarget = hotspotTarget && hotspotTarget.trim().toLowerCase() === node.title.trim().toLowerCase();
                        const isIconPickerOpen = openIconPickerNodeId === node.id;

                        return (
                          <div
                            key={node.id || nIdx}
                            style={{
                              padding: '12px',
                              borderRadius: '12px',
                              border: isNodeTarget
                                ? '2px solid #f59e0b'
                                : (isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #cbd5e1'),
                              background: isNodeTarget
                                ? (isDark ? '#1e1b4b' : '#fffdf5')
                                : (isDark ? '#111827' : '#ffffff'),
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {/* Card Top: Index, Badge, Reorder, Target, Delete */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                                    color: isDark ? '#f8fafc' : '#334155'
                                  }}
                                >
                                  #{nIdx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={node.badge || ''}
                                  placeholder="Badge (e.g. Stage 1)"
                                  onChange={(e) => onUpdateNode && onUpdateNode(node.id, 'badge', e.target.value)}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '3px 6px',
                                    borderRadius: '5px',
                                    border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
                                    background: isDark ? '#0b0f19' : '#f8fafc',
                                    color: isDark ? '#f8fafc' : '#1e293b',
                                    outline: 'none',
                                    width: '130px'
                                  }}
                                />
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => onSelectTarget && onSelectTarget(node.title)}
                                  style={{
                                    fontSize: '10.5px',
                                    fontWeight: 800,
                                    padding: '3px 8px',
                                    borderRadius: '5px',
                                    border: isNodeTarget ? '1px solid #f59e0b' : (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1'),
                                    background: isNodeTarget ? '#f59e0b' : 'transparent',
                                    color: isNodeTarget ? '#ffffff' : (isDark ? '#cbd5e1' : '#64748b'),
                                    cursor: 'pointer'
                                  }}
                                >
                                  {isNodeTarget ? '★ Target' : 'Target'}
                                </button>

                                <button
                                  type="button"
                                  disabled={nIdx === 0}
                                  onClick={() => onMoveNode && onMoveNode(nIdx, -1)}
                                  style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #cbd5e1',
                                    background: 'transparent',
                                    color: isDark ? '#f8fafc' : '#334155',
                                    cursor: nIdx === 0 ? 'not-allowed' : 'pointer',
                                    opacity: nIdx === 0 ? 0.3 : 1
                                  }}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  disabled={nIdx === customNodes.length - 1}
                                  onClick={() => onMoveNode && onMoveNode(nIdx, 1)}
                                  style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #cbd5e1',
                                    background: 'transparent',
                                    color: isDark ? '#f8fafc' : '#334155',
                                    cursor: nIdx === customNodes.length - 1 ? 'not-allowed' : 'pointer',
                                    opacity: nIdx === customNodes.length - 1 ? 0.3 : 1
                                  }}
                                >
                                  ↓
                                </button>

                                {customNodes.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => onRemoveNode && onRemoveNode(node.id)}
                                    title="Remove this object"
                                    style={{
                                      padding: '3px 6px',
                                      borderRadius: '4px',
                                      border: '1px solid rgba(244, 63, 94, 0.3)',
                                      background: 'rgba(244, 63, 94, 0.1)',
                                      color: '#f43f5e',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Card Middle: Icon button + Inputs */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px', alignItems: 'center' }}>
                              <div style={{ position: 'relative' }}>
                                <button
                                  type="button"
                                  onClick={() => setOpenIconPickerNodeId(isIconPickerOpen ? null : node.id)}
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    border: isDark ? '1.5px solid rgba(255, 255, 255, 0.15)' : '1.5px solid #cbd5e1',
                                    background: isDark ? '#0b0f19' : '#f8fafc',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                  }}
                                  title="Change icon"
                                >
                                  {renderDiagramNodeIcon(node.iconType, `text-${node.color || 'purple'}`)}
                                </button>

                                {isIconPickerOpen && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: '46px',
                                      left: 0,
                                      zIndex: 100,
                                      width: '260px',
                                      padding: '10px',
                                      borderRadius: '12px',
                                      background: isDark ? '#1e293b' : '#ffffff',
                                      border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #cbd5e1',
                                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(4, 1fr)',
                                      gap: '6px'
                                    }}
                                  >
                                    {AVAILABLE_DIAGRAM_ICONS.map((iconItem) => (
                                      <button
                                        key={iconItem.id}
                                        type="button"
                                        onClick={() => {
                                          if (onUpdateNode) onUpdateNode(node.id, 'iconType', iconItem.id);
                                          setOpenIconPickerNodeId(null);
                                        }}
                                        style={{
                                          padding: '6px 4px',
                                          borderRadius: '6px',
                                          border: node.iconType === iconItem.id ? '2px solid #8b5cf6' : 'none',
                                          background: node.iconType === iconItem.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          gap: '3px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {renderDiagramNodeIcon(iconItem.id, `text-${node.color || 'purple'}`)}
                                        <span style={{ fontSize: '8.5px', color: isDark ? '#cbd5e1' : '#475569' }}>
                                          {iconItem.id}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    value={node.title || ''}
                                    placeholder="Title"
                                    onChange={(e) => onUpdateNode && onUpdateNode(node.id, 'title', e.target.value)}
                                    style={{
                                      flex: 1,
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1',
                                      background: isDark ? '#0b0f19' : '#ffffff',
                                      color: isDark ? '#f8fafc' : '#1e293b',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      outline: 'none'
                                    }}
                                  />
                                  <div style={{ display: 'flex', gap: '3px' }}>
                                    {colors.map((cOption) => (
                                      <button
                                        key={cOption.id}
                                        type="button"
                                        onClick={() => onUpdateNode && onUpdateNode(node.id, 'color', cOption.id)}
                                        style={{
                                          width: '16px',
                                          height: '16px',
                                          borderRadius: '999px',
                                          background: cOption.hex,
                                          border: node.color === cOption.id ? '2px solid #ffffff' : 'none',
                                          boxShadow: node.color === cOption.id ? '0 0 0 2px #8b5cf6' : 'none',
                                          cursor: 'pointer'
                                        }}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <input
                                  type="text"
                                  value={node.subtitle || ''}
                                  placeholder="Description / Technical role"
                                  onChange={(e) => onUpdateNode && onUpdateNode(node.id, 'subtitle', e.target.value)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '5px',
                                    border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                                    background: isDark ? '#0b0f19' : '#f8fafc',
                                    color: isDark ? '#94a3b8' : '#64748b',
                                    fontSize: '11px',
                                    outline: 'none'
                                  }}
                                />

                                {/* Parent Node Relationship Selector */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isDark ? '#94a3b8' : '#64748b', fontSize: '10.5px', fontWeight: 600, flexShrink: 0 }}>
                                    <GitBranch size={12} style={{ color: '#8b5cf6' }} />
                                    <span>Parent:</span>
                                  </div>
                                  <select
                                    value={node.parentId || ''}
                                    onChange={(e) => onUpdateNode && onUpdateNode(node.id, 'parentId', e.target.value || null)}
                                    style={{
                                      flex: 1,
                                      padding: '3px 8px',
                                      borderRadius: '5px',
                                      border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1',
                                      background: isDark ? '#0b0f19' : '#ffffff',
                                      color: isDark ? '#f8fafc' : '#1e293b',
                                      fontSize: '11px',
                                      outline: 'none',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <option value="">None (Root Node)</option>
                                    {customNodes
                                      .filter((other) => other.id !== node.id)
                                      .map((other) => {
                                        const otherIdx = customNodes.indexOf(other) + 1;
                                        return (
                                          <option key={other.id} value={other.id}>
                                            #{otherIdx} {other.title || `Component ${otherIdx}`}
                                          </option>
                                        );
                                      })}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* RIGHT COLUMN: Large Live Diagram Canvas */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: isDark ? '#050811' : '#f1f5f9',
              overflow: 'hidden'
            }}
          >
            {/* Canvas Header Strip */}
            <div
              style={{
                padding: '12px 20px',
                borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: isDark ? 'rgba(11, 15, 25, 0.8)' : '#ffffff'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={15} color="#8b5cf6" />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Live Architecture Canvas
                </span>
                {hotspotTarget && (
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#f59e0b',
                      fontWeight: 700,
                      border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    ★ Target: {hotspotTarget}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>
                {customNodes.length} Components Active
              </div>
            </div>

            {/* Canvas Area: Large, Generous, Centered, Scrollable */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'auto',
                padding: '30px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div
                key={`${diagramTemplateId}-${customLayout}-${customNodes.length}`}
                className="diagram-canvas-animate"
                style={{ width: '100%', maxWidth: '980px' }}
              >
                <QuizDiagram
                  type={diagramTemplateId}
                  customNodes={customNodes}
                  customLayout={customLayout}
                  customTitle={customDiagramTitle || currentTemplate.name}
                  targetNode={hotspotTarget}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
