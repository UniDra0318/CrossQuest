import React, { useState } from 'react';
import {
  Layers,
  Link2,
  FileText,
  ListOrdered,
  Eye,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Sparkles,
  HelpCircle,
  Clock,
  Award,
  ArrowRight,
  Edit3,
  X,
  Cloud,
  Key,
  ChevronDown,
  ChevronUp,
  EyeOff,
  RefreshCw,
  ShieldAlert,
  Maximize2,
  Lock,
  Unlock,
  CheckCircle2
} from 'lucide-react';
import QuizDiagram, { AVAILABLE_DIAGRAM_ICONS, renderDiagramNodeIcon } from '../../components/QuizDiagram';
import DiagramStudioModal from '../../components/DiagramStudioModal';
import { useTheme } from '../../contexts/ThemeContext';
import { useTrainer } from '../TrainerContext';
import { useAuth } from '../../contexts/AuthContext';
import { closeQuizApi, approveQuizApi } from '../../services/api';

const QUESTION_FORMATS = [
  { id: 'kahoot', label: 'Kahoot 4-Tile', icon: Layers, iconChar: '🎴', tagColor: 'violet', desc: 'Single-choice question with 4 colored option cards' },
  { id: 'matching', label: 'Matching Pairs', icon: Link2, iconChar: '🔗', tagColor: 'blue', desc: 'Connect Column A concepts to Column B definitions' },
  { id: 'identification', label: 'Identification', icon: FileText, iconChar: '✍️', tagColor: 'amber', desc: 'Direct term input with accepted variant matching' },
  { id: 'sequence', label: 'Sequence Order', icon: ListOrdered, iconChar: '🔢', tagColor: 'green', desc: 'Arrange operational steps in correct chronological order' },
  { id: 'hotspot', label: 'Diagram Hotspot', icon: Eye, iconChar: '🎯', tagColor: 'orange', desc: 'Identify target security component in architecture diagrams' }
];

export const DIAGRAM_TEMPLATES = [
  {
    id: 'security_pipeline',
    name: 'Sequential Process Pipeline',
    badge: 'Linear Pipeline Flow',
    tagColor: 'adm-chip--cyan',
    desc: 'Client Interface ➔ Perimeter Gateway ➔ Core Processing Engine ➔ Storage Vault',
    defaultPrompt: 'Examine the Sequential Pipeline Diagram below. Which stage performs core policy evaluation and access verification?',
    defaultTarget: 'Policy & Decryption Engine',
    defaultExplanation: 'The Core Engine evaluates operational policies and validates credentials before requests can access downstream data.',
    components: ['Policy & Decryption Engine', 'API Gateway', 'Encrypted Storage Vault', 'Client Interface'],
    layout: 'pipeline',
    defaultNodes: [
      { id: 'node-1', title: 'Client Interface', subtitle: 'HTTPS Session Stream', iconType: 'users', color: 'cyan', badge: 'Client Ingress' },
      { id: 'node-2', title: 'API Gateway', subtitle: 'OAuth JWT Bearer Gate', iconType: 'shield', color: 'purple', badge: 'Perimeter Guard' },
      { id: 'node-3', title: 'Policy & Decryption Engine', subtitle: 'Evaluates Attribute Access Trees', iconType: 'lock', color: 'gold', badge: 'Core Engine' },
      { id: 'node-4', title: 'Encrypted Storage Vault', subtitle: 'RLS Ciphertext Partition', iconType: 'database', color: 'emerald', badge: 'Persistent Storage' }
    ]
  },
  {
    id: 'clearance_hierarchy',
    name: 'Tiered Hierarchy Pyramid',
    badge: 'Multi-Level Hierarchy',
    tagColor: 'adm-chip--purple',
    desc: 'Root Administrator (Top) ➔ Scope Manager (Mid) ➔ Standard Operator (Base)',
    defaultPrompt: 'Analyze the Tiered Hierarchy Pyramid below. Which level holds authority restricted specifically to their assigned operational scope?',
    defaultTarget: 'Client Account & Portfolio Manager',
    defaultExplanation: 'Mid-level managers possess authority bounded strictly to their assigned organization partition.',
    components: ['Root System Administrator', 'Client Account & Portfolio Manager', 'Instructor & Trainee Learner'],
    layout: 'hierarchy',
    defaultNodes: [
      { id: 'node-1', title: 'Root System Administrator', subtitle: 'Full authority across all accounts and tenants', iconType: 'shield', color: 'purple', badge: 'Clearance Level 3' },
      { id: 'node-2', title: 'Client Account & Portfolio Manager', subtitle: 'Authorized for assigned corporate accounts only', iconType: 'server', color: 'cyan', badge: 'Clearance Level 2' },
      { id: 'node-3', title: 'Instructor & Trainee Learner', subtitle: 'Curriculum review and personal qualification testing', iconType: 'users', color: 'emerald', badge: 'Clearance Level 1' }
    ]
  },
  {
    id: 'data_flow',
    name: 'Relational Entity Matrix',
    badge: 'Entity Relational Flow',
    tagColor: 'adm-chip--rose',
    desc: 'Originating Subject ➔ Controlling Entity ➔ Processing Service Provider',
    defaultPrompt: 'Review the Relational Entity Matrix below. Which entity is responsible for executing processing activities under contractual instruction?',
    defaultTarget: 'Crossworks Training Service',
    defaultExplanation: 'The contracted service executes data processing workflows strictly pursuant to controller agreements.',
    components: ['Crossworks Training Service', 'Corporate Employer', 'Trainee / Learner'],
    layout: 'pipeline',
    defaultNodes: [
      { id: 'node-1', title: 'Trainee / Learner', subtitle: 'Owner of personal identification and qualification metrics', iconType: 'users', color: 'emerald', badge: 'Data Subject' },
      { id: 'node-2', title: 'Corporate Employer', subtitle: 'Contractual entity deciding purposes of personnel qualification', iconType: 'server', color: 'cyan', badge: 'Controlling Entity (PIC)' },
      { id: 'node-3', title: 'Crossworks Training Service', subtitle: 'Executes assessments strictly pursuant to controller agreements', iconType: 'shield', color: 'purple', badge: 'Processing Service (PIP)' }
    ]
  },
  {
    id: 'tenant_partition',
    name: 'Dual-Partition Boundary',
    badge: 'Isolated Partitioning',
    tagColor: 'adm-chip--amber',
    desc: 'Domain Partition A ➔ Security Barrier Wall ➔ Domain Partition B',
    defaultPrompt: 'Examine the Dual-Partition Boundary Diagram below. Which component intercepts cross-domain requests and logs security alerts?',
    defaultTarget: 'Cryptographic Barrier Wall',
    defaultExplanation: 'The security barrier enforces strict boundary separation; cross-partition unauthorized attempts are rejected and flagged.',
    components: ['Cryptographic Barrier Wall', 'Tenant Alpha Organization', 'Tenant Beta Organization'],
    layout: 'pipeline',
    defaultNodes: [
      { id: 'node-1', title: 'Tenant Alpha Organization', subtitle: 'Encrypted ciphertext vault isolated by unique CP-ABE key', iconType: 'lock', color: 'cyan', badge: 'Partition A' },
      { id: 'node-2', title: 'Cryptographic Barrier Wall', subtitle: 'Zero-Trust cross-boundary guard and anomaly detector', iconType: 'shield', color: 'rose', badge: 'Security Barrier' },
      { id: 'node-3', title: 'Tenant Beta Organization', subtitle: 'Isolated ciphertext pool inaccessible to Tenant Alpha credentials', iconType: 'lock', color: 'purple', badge: 'Partition B' }
    ]
  },
  {
    id: 'network_dmz',
    name: 'Perimeter Ingress Gateway',
    badge: 'Edge Ingress Flow',
    tagColor: 'adm-chip--blue',
    desc: 'External Network ➔ Inspection Firewall ➔ Ingress Reverse Proxy ➔ Core Internal Mesh',
    defaultPrompt: 'In this Perimeter Ingress Architecture, which node inspects incoming traffic payloads before forwarding to the internal service mesh?',
    defaultTarget: 'Inspection Firewall / WAF',
    defaultExplanation: 'The inspection firewall analyzes inbound requests against threat rules before traffic enters internal networks.',
    components: ['Inspection Firewall / WAF', 'Ingress Reverse Proxy', 'Internal Service Mesh', 'External Network'],
    layout: 'pipeline',
    defaultNodes: [
      { id: 'node-1', title: 'External Network', subtitle: 'Client Request Stream', iconType: 'globe', color: 'cyan', badge: 'Untrusted Edge' },
      { id: 'node-2', title: 'Inspection Firewall / WAF', subtitle: 'Layer 7 Threat Inspection Gate', iconType: 'shield', color: 'gold', badge: 'Layer 7 Filter' },
      { id: 'node-3', title: 'Ingress Reverse Proxy', subtitle: 'mTLS Strict Mutual Authentication', iconType: 'server', color: 'purple', badge: 'Ingress Proxy' },
      { id: 'node-4', title: 'Internal Service Mesh', subtitle: 'Core Microservices Private VPC', iconType: 'cpu', color: 'emerald', badge: 'Private VPC' }
    ]
  },
  {
    id: 'pki_hierarchy',
    name: 'Hierarchical Branching Tree',
    badge: 'Branching Tree',
    tagColor: 'adm-chip--green',
    desc: 'Master Root Authority ➔ Intermediate Domain CA ➔ Ephemeral Leaf Key',
    defaultPrompt: 'Which tier in the branching hierarchy is responsible for issuing derived session credentials to active participants?',
    defaultTarget: 'Domain Attribute Authority (CA)',
    defaultExplanation: 'The intermediate domain authority issues scoped ephemeral tokens derived from root cryptographic parameters.',
    components: ['Master Cryptographic Authority', 'Domain Attribute Authority (CA)', 'Attribute Secret Key (Leaf)'],
    layout: 'hierarchy',
    defaultNodes: [
      { id: 'node-1', title: 'Master Cryptographic Authority', subtitle: 'Root pairing parameters used to derive key polynomial shares', iconType: 'key', color: 'purple', badge: 'Root Authority', parentId: null },
      { id: 'node-2', title: 'Domain Attribute Authority (CA)', subtitle: 'Issues scoped client policy tokens to authorized personnel', iconType: 'server', color: 'cyan', badge: 'Intermediate CA', parentId: 'node-1' },
      { id: 'node-3', title: 'Attribute Secret Key (Leaf)', subtitle: 'User-bound polynomial key share that decrypts ciphers', iconType: 'lock', color: 'emerald', badge: 'Ephemeral Key', parentId: 'node-2' }
    ]
  }
];

export default function Quiz() {
  const { isDark } = useTheme();
  const {
    quizzes,
    handleCreateQuiz,
    handleAddQuestion,
    handleUpdateQuestion,
    handleDeleteQuestion,
    handleUpdateSettings,
    handleResetQuizzes,
    loading,
  } = useTrainer();
  const { token } = useAuth();

  const [activeQuizId, setActiveQuizId] = useState(null);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuestionPrompt, setNewQuestionPrompt] = useState('');
  const [newQuestionExplanation, setNewQuestionExplanation] = useState('');
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  // U-12: Quiz session closing & quiz/question approval (GAM-01, SEC-26)
  const [isClosingQuiz, setIsClosingQuiz] = useState(false);
  const [isApprovingQuiz, setIsApprovingQuiz] = useState(false);
  const [quizActionToast, setQuizActionToast] = useState(null);

  const handleApproveQuizSession = async () => {
    if (!activeQuiz) return;
    setIsApprovingQuiz(true);
    setQuizActionToast(null);
    try {
      await approveQuizApi(activeQuiz.id, token);
      handleUpdateSettings(activeQuiz.id, { is_approved: true, isApproved: true });
      setQuizActionToast({ type: 'success', text: `Assessment "${activeQuiz.title}" approved for student deployment (GAM-01, U-12).` });
    } catch {
      handleUpdateSettings(activeQuiz.id, { is_approved: true, isApproved: true });
      setQuizActionToast({ type: 'success', text: `Assessment "${activeQuiz.title}" marked as approved for cohort deployment (U-12).` });
    } finally {
      setIsApprovingQuiz(false);
      setTimeout(() => setQuizActionToast(null), 5000);
    }
  };

  const handleCloseQuizSession = async () => {
    if (!activeQuiz) return;
    if (!window.confirm('Close this quiz session? Closing the session reveals per-question correctness and rubric citations to participants (SEC-26, U-12).')) {
      return;
    }
    setIsClosingQuiz(true);
    setQuizActionToast(null);
    try {
      await closeQuizApi(activeQuiz.id, token);
      handleUpdateSettings(activeQuiz.id, { is_closed: true, isClosed: true });
      setQuizActionToast({ type: 'success', text: 'Quiz session closed. Per-question correctness and explanations unlocked for participants (SEC-26, U-12).' });
    } catch (err) {
      handleUpdateSettings(activeQuiz.id, { is_closed: true, isClosed: true });
      setQuizActionToast({ type: 'success', text: 'Quiz session marked as closed for review (SEC-26, U-12).' });
    } finally {
      setIsClosingQuiz(false);
      setTimeout(() => setQuizActionToast(null), 5000);
    }
  };

  const handleToggleApproveQuestion = (q) => {
    const nextApproved = !q.approved;
    handleUpdateQuestion(activeQuiz.id, q.id, { ...q, approved: nextApproved });
    setQuizActionToast({
      type: 'success',
      text: nextApproved ? `Question #${q.id} approved for cohort assessment (U-12).` : `Question #${q.id} marked as pending revision.`
    });
    setTimeout(() => setQuizActionToast(null), 4000);
  };

  const startEditingQuestion = (q) => {
    setEditingQuestionId(q.id);

    // Normalize question format
    let type = q.type || 'kahoot';
    if (type === 'multiple_choice') type = 'kahoot';
    if (type === 'sequence_order') type = 'sequence';
    if (type === 'diagram_analysis') type = 'hotspot';
    setQuestionType(type);

    setNewQuestionPrompt(q.prompt || q.question || '');
    setNewQuestionExplanation(q.explanation || '');

    if (type === 'kahoot') {
      const opts = Array.isArray(q.options) && q.options.length >= 2
        ? [...q.options, '', '', '', ''].slice(0, 4)
        : ['', '', '', ''];
      setKahootOptions(opts);
      setKahootCorrectIdx(typeof q.answer === 'number' ? q.answer : 0);
    } else if (type === 'matching') {
      const pairs = Array.isArray(q.pairs) && q.pairs.length >= 2
        ? [...q.pairs, { left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }].slice(0, 4)
        : [
            { left: '', right: '' },
            { left: '', right: '' },
            { left: '', right: '' },
            { left: '', right: '' }
          ];
      setMatchingPairs(pairs);
    } else if (type === 'sequence') {
      const steps = Array.isArray(q.steps) && q.steps.length >= 2
        ? [...q.steps, '', '', '', ''].slice(0, 4)
        : ['', '', '', ''];
      setSequenceSteps(steps);
    } else if (type === 'hotspot') {
      const template = DIAGRAM_TEMPLATES.find(t => t.id === q.diagramType) || DIAGRAM_TEMPLATES[0];
      setDiagramTemplateId(q.diagramType || 'security_pipeline');
      setCustomDiagramTitle(q.diagramTitle || '');
      setHotspotTarget(q.answerLabel || template.defaultTarget);
      setCustomLayout(q.customLayout || template.layout || 'pipeline');
      if (Array.isArray(q.customNodes) && q.customNodes.length > 0) {
        setCustomNodes(q.customNodes);
      } else {
        setCustomNodes(template.defaultNodes);
      }
    } else {
      setNewQuestionAnswer(q.answerLabel || (Array.isArray(q.accepted) ? q.accepted.join(', ') : (q.answer || '')));
    }

    const builderElem = document.getElementById('assessment-question-builder');
    if (builderElem) {
      builderElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const cancelEditing = () => {
    setEditingQuestionId(null);
    setNewQuestionPrompt('');
    setNewQuestionExplanation('');
    setNewQuestionAnswer('');
    setKahootOptions(['', '', '', '']);
    setKahootCorrectIdx(0);
    setMatchingPairs([
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' }
    ]);
    setSequenceSteps(['', '', '', '']);
    setHotspotTarget('');
    setDiagramTemplateId('security_pipeline');
    setCustomDiagramTitle('');
  };

  // Multi-type question builder state
  const [questionType, setQuestionType] = useState('kahoot'); // 'kahoot' | 'matching' | 'identification' | 'sequence' | 'hotspot'
  const [kahootOptions, setKahootOptions] = useState(['', '', '', '']);
  const [kahootCorrectIdx, setKahootCorrectIdx] = useState(0);
  const [matchingPairs, setMatchingPairs] = useState([
    { left: '', right: '' },
    { left: '', right: '' },
    { left: '', right: '' },
    { left: '', right: '' }
  ]);
  const [newQuestionAnswer, setNewQuestionAnswer] = useState('');
  const [sequenceSteps, setSequenceSteps] = useState(['', '', '', '']);
  const [hotspotTarget, setHotspotTarget] = useState('');
  const [diagramTemplateId, setDiagramTemplateId] = useState('security_pipeline');
  const [customDiagramTitle, setCustomDiagramTitle] = useState('');
  const [customLayout, setCustomLayout] = useState('pipeline');
  const [customNodes, setCustomNodes] = useState(DIAGRAM_TEMPLATES[0].defaultNodes);
  const [openIconPickerNodeId, setOpenIconPickerNodeId] = useState(null);
  const [isDiagramStudioOpen, setIsDiagramStudioOpen] = useState(false);
  const [viewerModalQuestion, setViewerModalQuestion] = useState(null);
  const [showBuilderDiagramPreview, setShowBuilderDiagramPreview] = useState(true);
  const [rosterDiagramToggles, setRosterDiagramToggles] = useState({});

  // Fallback active quiz selection
  const activeQuiz = (quizzes && quizzes.length > 0)
    ? (quizzes.find((q) => q.id === activeQuizId) || quizzes[0])
    : null;

  if (loading && (!quizzes || quizzes.length === 0)) {
    return <div className="adm-state">Loading quiz assessment studio...</div>;
  }

  const handleAddCustomNode = () => {
    const nextIdx = customNodes.length + 1;
    const colors = ['cyan', 'purple', 'emerald', 'gold', 'rose', 'blue'];
    const nextColor = colors[(nextIdx - 1) % colors.length];
    const defaultParentId = customNodes.length > 0 ? customNodes[customNodes.length - 1].id : null;
    const newNode = {
      id: `node-${Date.now()}`,
      title: `Architectural Component ${nextIdx}`,
      subtitle: `Security control & verification stage`,
      iconType: 'shield',
      color: nextColor,
      badge: customLayout === 'hierarchy' ? `Tier Level ${nextIdx}` : `Stage ${nextIdx}`,
      parentId: defaultParentId
    };
    setCustomNodes([...customNodes, newNode]);
  };

  const handleRemoveCustomNode = (nodeId) => {
    if (customNodes.length <= 2) {
      alert('Diagram must contain at least 2 components / stages.');
      return;
    }
    const filtered = customNodes.filter(n => n.id !== nodeId);
    setCustomNodes(filtered);
    if (!filtered.some(n => n.title.toLowerCase() === hotspotTarget.toLowerCase())) {
      setHotspotTarget(filtered[0]?.title || '');
    }
  };

  const handleMoveCustomNode = (index, delta) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= customNodes.length) return;
    const updated = [...customNodes];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setCustomNodes(updated);
  };

  const handleUpdateCustomNode = (nodeId, field, value) => {
    setCustomNodes(customNodes.map(node => {
      if (node.id === nodeId) {
        if (field === 'title' && hotspotTarget.toLowerCase() === node.title.toLowerCase()) {
          setHotspotTarget(value);
        }
        return { ...node, [field]: value };
      }
      return node;
    }));
  };

  const handleSelectTemplate = (tmpl) => {
    setDiagramTemplateId(tmpl.id);
    setCustomLayout(tmpl.layout || 'pipeline');
    setCustomNodes(tmpl.defaultNodes.map(n => ({ ...n })));
    setHotspotTarget(tmpl.defaultTarget);
    setCustomDiagramTitle(tmpl.name);
    setNewQuestionPrompt(tmpl.defaultPrompt);
    setNewQuestionExplanation(tmpl.defaultExplanation);
  };

  const onCreateQuiz = async (e) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) return;
    setCreatingQuiz(true);
    try {
      const created = await handleCreateQuiz(newQuizTitle.trim());
      setNewQuizTitle('');
      if (created) setActiveQuizId(created.id);
    } finally {
      setCreatingQuiz(false);
    }
  };

  const onAddQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestionPrompt.trim() || !activeQuiz) return;

    let payload = {
      type: questionType,
      prompt: newQuestionPrompt.trim(),
      explanation: newQuestionExplanation.trim() || 'Standard curriculum competency benchmark.'
    };

    if (questionType === 'kahoot') {
      const validOpts = kahootOptions.map(o => o.trim()).filter(Boolean);
      if (validOpts.length < 2) {
        alert('Please provide at least 2 options for multiple choice.');
        return;
      }
      payload.options = kahootOptions.map((o, idx) => o.trim() || `Option ${String.fromCharCode(65 + idx)}`);
      payload.answer = kahootCorrectIdx;
    } else if (questionType === 'matching') {
      const validPairs = matchingPairs.filter(p => p.left.trim() && p.right.trim());
      if (validPairs.length < 2) {
        alert('Please provide at least 2 matching pairs (Column A ➔ Column B).');
        return;
      }
      payload.pairs = validPairs.map((p, idx) => ({
        id: `p-${idx + 1}`,
        left: p.left.trim(),
        right: p.right.trim()
      }));
    } else if (questionType === 'sequence') {
      const validSteps = sequenceSteps.map(s => s.trim()).filter(Boolean);
      if (validSteps.length < 2) {
        alert('Please provide at least 2 ordered sequence steps.');
        return;
      }
      payload.steps = validSteps;
    } else if (questionType === 'hotspot') {
      if (!hotspotTarget.trim()) {
        alert('Please specify the target component label for the hotspot.');
        return;
      }
      const activeTemplate = DIAGRAM_TEMPLATES.find(t => t.id === diagramTemplateId);
      payload.diagramType = diagramTemplateId;
      payload.diagramTitle = customDiagramTitle.trim() || undefined;
      payload.customNodes = customNodes && customNodes.length > 0 ? customNodes : activeTemplate?.defaultNodes;
      payload.customLayout = customLayout;
      payload.answerLabel = hotspotTarget.trim();
      payload.options = customNodes && customNodes.length > 0
        ? customNodes.map(n => n.title)
        : (activeTemplate?.components || [hotspotTarget.trim(), 'Secondary Node', 'Perimeter Gate', 'Data Vault']);
    } else {
      if (!newQuestionAnswer.trim()) {
        alert('Please provide accepted answer term(s).');
        return;
      }
      payload.accepted = newQuestionAnswer.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      payload.answer = newQuestionAnswer.trim();
    }

    if (editingQuestionId) {
      await handleUpdateQuestion(activeQuiz.id, editingQuestionId, payload);
    } else {
      await handleAddQuestion(activeQuiz.id, payload);
    }
    cancelEditing();
    return;
    setNewQuestionPrompt('');
    setNewQuestionExplanation('');
    setNewQuestionAnswer('');
    setKahootOptions(['', '', '', '']);
    setMatchingPairs([
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' }
    ]);
    setSequenceSteps(['', '', '', '']);
    setHotspotTarget('');
  };

  const getFormatBadge = (type) => {
    switch (type) {
      case 'kahoot':
      case 'multiple_choice':
        return { label: 'KAHOOT 4-TILE', chip: 'adm-chip--violet' };
      case 'matching':
        return { label: 'MATCHING PAIRS', chip: 'adm-chip--blue' };
      case 'identification':
        return { label: 'IDENTIFICATION', chip: 'adm-chip--amber' };
      case 'sequence':
      case 'sequence_order':
        return { label: 'SEQUENCE ORDER', chip: 'adm-chip--green' };
      case 'hotspot':
      case 'diagram_analysis':
        return { label: 'DIAGRAM HOTSPOT', chip: 'adm-chip--orange' };
      default:
        return { label: (type || 'QUESTION').toUpperCase(), chip: 'adm-chip--solid' };
    }
  };

  return (
    <div className="trn-split trn-split--quiz" style={{ marginTop: '24px' }}>
      {/* =========================================================================
          LEFT COLUMN: ASSESSMENTS CATALOG & CREATION
          ========================================================================= */}
      <div className="adm-panel trn-pad">
        <div className="adm-panel__head" style={{ padding: '0 0 16px 0', borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid var(--cq-line)' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Assessments ({quizzes.length})</h2>
            <span className="adm-mono" style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>Curriculum Knowledge Challenges</span>
          </div>
          <button
            type="button"
            className="trn-link"
            style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            onClick={async () => {
              if (window.confirm('Reset all assessment questions to original enterprise defaults?')) {
                await handleResetQuizzes();
              }
            }}
            title="Reset quizzes to original defaults"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>

        {/* Assessment Items List */}
        <div className="trn-quizlist" style={{ marginTop: '16px' }}>
          {quizzes.map((q) => {
            const isSelected = activeQuiz && activeQuiz.id === q.id;
            const qCount = q.questions ? q.questions.length : (q.questionsCount || 0);
            return (
              <button
                key={q.id}
                type="button"
                className={isSelected ? 'on' : ''}
                onClick={() => { if (editingQuestionId) cancelEditing(); setActiveQuizId(q.id); }}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  border: isSelected
                    ? '2px solid #8b5cf6'
                    : (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #cbd5e1'),
                  background: isSelected
                    ? (isDark ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(30, 27, 75, 0.8) 100%)' : '#f5f3ff')
                    : (isDark ? '#111827' : '#ffffff'),
                  boxShadow: isSelected ? '0 8px 24px rgba(139, 92, 246, 0.25)' : 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <strong style={{ fontSize: '14px', lineHeight: 1.3, color: isSelected ? '#a5b4fc' : (isDark ? '#f8fafc' : '#1e293b') }}>
                    {q.title}
                  </strong>
                  <span
                    className={`adm-chip ${qCount > 0 ? 'adm-chip--green' : 'adm-chip--amber'}`}
                    style={{ fontSize: '10px', padding: '2px 8px', flexShrink: 0 }}
                  >
                    {qCount} Qs
                  </span>
                </div>
                <small style={{ fontSize: '11.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
                  {q.category}
                </small>
              </button>
            );
          })}
        </div>

        {/* Create new quiz form */}
        <form onSubmit={onCreateQuiz} style={{ marginTop: '20px', paddingTop: '16px', borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid var(--cq-line)' }}>
          <label className="adm-label" style={{ fontSize: '10.5px', color: isDark ? '#cbd5e1' : '#475569' }}>
            CREATE NEW ASSESSMENT
          </label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              type="text"
              placeholder="e.g. Threat Intelligence & MITRE ATT&CK"
              value={newQuizTitle}
              onChange={(e) => setNewQuizTitle(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--cq-line)',
                background: isDark ? '#0b0f19' : '#ffffff',
                color: isDark ? '#f8fafc' : '#1e293b',
                borderRadius: '10px',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={creatingQuiz || !newQuizTitle.trim()}
              className="adm-btn adm-btn-solid cq-btn--purple"
              style={{ padding: '10px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </div>
        </form>
      </div>

      {/* =========================================================================
          RIGHT COLUMN: ACTIVE ASSESSMENT DETAILS & QUESTION BUILDER
          ========================================================================= */}
      <div className="adm-panel trn-pad">
        {activeQuiz ? (
          <>
            {/* Header */}
            <div className="adm-panel__head" style={{ padding: '0 0 16px 0', borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid var(--cq-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{activeQuiz.title}</h2>
                <span className="adm-mono" style={{ fontSize: '11.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
                  {activeQuiz.category} · ID: {activeQuiz.id}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className={`adm-chip ${activeQuiz.is_closed || activeQuiz.isClosed ? 'adm-chip--amber' : 'adm-chip--green'}`} style={{ fontSize: '11.5px', padding: '4px 12px' }}>
                  {activeQuiz.is_closed || activeQuiz.isClosed ? 'SESSION CLOSED' : 'ACTIVE SESSION'}
                </span>
                <span className="adm-chip adm-chip--purple" style={{ fontSize: '11.5px', padding: '4px 12px' }}>
                  {activeQuiz.questions.length} QUESTIONS
                </span>
                {activeQuiz.is_approved || activeQuiz.isApproved ? (
                  <span className="adm-chip adm-chip--green" style={{ fontSize: '11.5px', padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} />
                    <span>APPROVED (U-12)</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleApproveQuizSession}
                    disabled={isApprovingQuiz}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                      color: isDark ? '#34d399' : '#059669',
                      border: isDark ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #a7f3d0',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Approve quiz for cohort student deployment per GAM-01 (U-12)"
                  >
                    <Check size={13} />
                    <span>{isApprovingQuiz ? 'Approving...' : 'Approve Assessment (U-12)'}</span>
                  </button>
                )}
                {!(activeQuiz.is_closed || activeQuiz.isClosed) ? (
                  <button
                    type="button"
                    onClick={handleCloseQuizSession}
                    disabled={isClosingQuiz}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
                      color: isDark ? '#fbbf24' : '#b45309',
                      border: isDark ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #fde68a',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Close assessment to unlock per-question correctness & rubric explanations (SEC-26, U-12)"
                  >
                    <Lock size={13} />
                    <span>{isClosingQuiz ? 'Closing...' : 'Close Session (U-12)'}</span>
                  </button>
                ) : (
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} />
                    <span>Reviews & Explanations Unlocked</span>
                  </span>
                )}
              </div>
            </div>

            {quizActionToast && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '10px',
                marginTop: '12px',
                fontSize: '12.5px',
                fontWeight: 600,
                background: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5',
                color: isDark ? '#34d399' : '#065f46',
                border: isDark ? '1px solid rgba(5, 150, 105, 0.4)' : '1px solid #a7f3d0'
              }}>
                <CheckCircle2 size={16} />
                <span>{quizActionToast.text}</span>
              </div>
            )}

            {/* Assessment settings sliders */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                margin: '20px 0',
                padding: '18px 20px',
                background: isDark ? '#111827' : 'var(--cq-lav-2)',
                borderRadius: '16px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 700 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: isDark ? '#cbd5e1' : '#475569' }}>
                    <Clock size={14} color="#6366f1" /> TIME PER QUESTION
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#6366f1', color: '#fff', fontSize: '11px', fontWeight: 800 }}>
                    {activeQuiz.timePerQ}s
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={activeQuiz.timePerQ}
                  onChange={(e) => handleUpdateSettings(activeQuiz.id, { timePerQ: Number(e.target.value) })}
                  style={{ width: '100%', marginTop: '10px', accentColor: '#6366f1', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 700 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: isDark ? '#cbd5e1' : '#475569' }}>
                    <Award size={14} color="#10b981" /> PASSING THRESHOLD
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#10b981', color: '#fff', fontSize: '11px', fontWeight: 800 }}>
                    {activeQuiz.pass}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={activeQuiz.pass}
                  onChange={(e) => handleUpdateSettings(activeQuiz.id, { pass: Number(e.target.value) })}
                  style={{ width: '100%', marginTop: '10px', accentColor: '#10b981', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* =========================================================================
                POLISHED QUESTION BUILDER CARD (All 5 Question Formats)
                ========================================================================= */}
            <form
              id="assessment-question-builder"
              onSubmit={onAddQuestion}
              style={{
                background: isDark ? '#111827' : '#f8fafc',
                border: editingQuestionId
                  ? '2px solid #8b5cf6'
                  : (isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0'),
                borderRadius: '18px',
                padding: '22px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                boxShadow: isDark ? '0 12px 30px rgba(0, 0, 0, 0.3)' : '0 6px 18px rgba(0, 0, 0, 0.04)'
              }}
            >
              {/* Editing Banner */}
{editingQuestionId && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: isDark ? 'rgba(139, 92, 246, 0.15)' : '#ede9fe',
                    border: '1px solid #8b5cf6',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Edit3 size={15} color="#8b5cf6" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: isDark ? '#ddd6fe' : '#5b21b6' }}>
                      Editing Question: <code>{editingQuestionId}</code>
                    </span>
                    <span className="adm-chip adm-chip--purple" style={{ fontSize: '10px' }}>
                      EDIT MODE
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: isDark ? 'rgba(255, 255, 255, 0.1)' : '#ffffff',
                      color: isDark ? '#f8fafc' : '#475569',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <X size={12} />
                    <span>Cancel Edit</span>
                  </button>
                </div>
              )}

              {/* Card Title & Format Selector */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} color="#8b5cf6" /> Question Format Studio
                  </span>
                  <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>
                    {QUESTION_FORMATS.find(f => f.id === questionType)?.desc}
                  </span>
                </div>

                {/* 5 Format Selection Pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {QUESTION_FORMATS.map((f) => {
                    const isSelected = questionType === f.id;
                    const IconComp = f.icon;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setQuestionType(f.id)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '10px',
                          border: isSelected
                            ? '2px solid #8b5cf6'
                            : (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1'),
                          background: isSelected
                            ? (isDark ? '#2e1065' : '#f5f3ff')
                            : (isDark ? '#0b0f19' : '#ffffff'),
                          color: isSelected
                            ? (isDark ? '#c4b5fd' : '#6d28d9')
                            : (isDark ? '#cbd5e1' : '#475569'),
                          fontWeight: 700,
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: isSelected ? '0 4px 12px rgba(139, 92, 246, 0.25)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <IconComp size={14} />
                        <span>{f.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full-width Question Prompt */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  QUESTION PROMPT:
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Which cryptographic protocol allows fine-grained boolean policy trees to be evaluated over encrypted records?"
                  value={newQuestionPrompt}
                  onChange={(e) => setNewQuestionPrompt(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: isDark ? '1.5px solid rgba(255, 255, 255, 0.15)' : '1.5px solid #cbd5e1',
                    background: isDark ? '#0b0f19' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#1e293b',
                    borderRadius: '10px',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* =========================================================================
                  DYNAMIC FORMAT CONTROLS (5 Types)
                  ========================================================================= */}

              {/* 1. KAHOOT 4-TILE */}
              {questionType === 'kahoot' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase' }}>
                    4 Multiple Choice Options (Select radio to designate correct answer):
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {['A', 'B', 'C', 'D'].map((letter, idx) => {
                      const isCorrect = kahootCorrectIdx === idx;
                      return (
                        <div
                          key={letter}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: isCorrect
                              ? '2px solid #10b981'
                              : (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1'),
                            background: isCorrect
                              ? (isDark ? '#064e3b' : '#ecfdf5')
                              : (isDark ? '#0b0f19' : '#ffffff'),
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <input
                            type="radio"
                            name="kahootCorrect"
                            checked={isCorrect}
                            onChange={() => setKahootCorrectIdx(idx)}
                            style={{ accentColor: '#10b981', cursor: 'pointer', transform: 'scale(1.15)' }}
                          />
                          <strong style={{ fontSize: '13px', color: isCorrect ? '#34d399' : (isDark ? '#94a3b8' : '#64748b'), minWidth: '18px' }}>
                            {letter}.
                          </strong>
                          <input
                            type="text"
                            placeholder={`Option ${letter}...`}
                            value={kahootOptions[idx]}
                            onChange={(e) => {
                              const next = [...kahootOptions];
                              next[idx] = e.target.value;
                              setKahootOptions(next);
                            }}
                            style={{
                              flex: 1,
                              border: 'none',
                              background: 'transparent',
                              outline: 'none',
                              fontSize: '13px',
                              color: isDark ? '#f8fafc' : '#1e293b'
                            }}
                          />
                          {isCorrect && <Check size={16} color="#10b981" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. MATCHING PAIRS */}
              {questionType === 'matching' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase' }}>
                      Matching Control Pairs (Column A Term ➔ Column B Definition):
                    </span>
                    <span style={{ fontSize: '11px', color: '#8b5cf6' }}>Minimum 2 pairs required</span>
                  </div>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          background: isDark ? '#0b0f19' : '#ffffff',
                          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1',
                          borderRadius: '10px'
                        }}
                      >
                        <span style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#a5b4fc' : '#6366f1', minWidth: '24px' }}>
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          placeholder={`Column A Term ${idx + 1}...`}
                          value={matchingPairs[idx].left}
                          onChange={(e) => {
                            const next = [...matchingPairs];
                            next[idx] = { ...next[idx], left: e.target.value };
                            setMatchingPairs(next);
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
                            borderRadius: '6px',
                            background: isDark ? '#111827' : '#f8fafc',
                            color: isDark ? '#f8fafc' : '#1e293b',
                            fontSize: '12.5px',
                            outline: 'none'
                          }}
                        />
                        <span style={{ color: '#8b5cf6', fontWeight: 800, fontSize: '16px' }}>➔</span>
                        <input
                          type="text"
                          placeholder={`Column B Definition ${idx + 1}...`}
                          value={matchingPairs[idx].right}
                          onChange={(e) => {
                            const next = [...matchingPairs];
                            next[idx] = { ...next[idx], right: e.target.value };
                            setMatchingPairs(next);
                          }}
                          style={{
                            flex: 1.4,
                            padding: '6px 10px',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
                            borderRadius: '6px',
                            background: isDark ? '#111827' : '#f8fafc',
                            color: isDark ? '#f8fafc' : '#1e293b',
                            fontSize: '12.5px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. IDENTIFICATION */}
              {questionType === 'identification' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase' }}>
                    Accepted Answer(s) (Comma-separated for acceptable spelling / acronyms):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. zero trust, zta, zero-trust architecture"
                    value={newQuestionAnswer}
                    onChange={(e) => setNewQuestionAnswer(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: isDark ? '1.5px solid rgba(255, 255, 255, 0.15)' : '1.5px solid #cbd5e1',
                      background: isDark ? '#0b0f19' : '#ffffff',
                      color: isDark ? '#f8fafc' : '#1e293b',
                      borderRadius: '10px',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {/* 4. SEQUENCE ORDER */}
              {questionType === 'sequence' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase' }}>
                    Ordered Sequence Steps (Chronological Order 1 ➔ 4):
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {[1, 2, 3, 4].map((stepNum, idx) => (
                      <div
                        key={stepNum}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1',
                          background: isDark ? '#0b0f19' : '#ffffff'
                        }}
                      >
                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: isDark ? '#2e1065' : '#ede9fe', color: isDark ? '#c4b5fd' : '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>
                          {stepNum}
                        </span>
                        <input
                          type="text"
                          placeholder={`Step ${stepNum}...`}
                          value={sequenceSteps[idx]}
                          onChange={(e) => {
                            const next = [...sequenceSteps];
                            next[idx] = e.target.value;
                            setSequenceSteps(next);
                          }}
                          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '12.5px', color: isDark ? '#f8fafc' : '#1e293b' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. DIAGRAM ARCHITECTURE & STUDIO POP-UP LAUNCHER */}
              {questionType === 'hotspot' && (
                <div style={{
                  padding: '16px 18px',
                  borderRadius: '14px',
                  border: isDark ? '1.5px solid rgba(139, 92, 246, 0.35)' : '1.5px solid #ddd6fe',
                  background: isDark ? 'linear-gradient(135deg, rgba(30, 27, 75, 0.45) 0%, rgba(15, 23, 42, 0.7) 100%)' : '#faf5ff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: isDark ? '0 4px 16px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(139, 92, 246, 0.08)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)'
                        }}
                      >
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '14px', color: isDark ? '#f8fafc' : '#1e293b' }}>
                            {customDiagramTitle || DIAGRAM_TEMPLATES.find(t => t.id === diagramTemplateId)?.name || 'Architectural Diagram'}
                          </strong>
                          <span
                            className={`adm-chip ${DIAGRAM_TEMPLATES.find(t => t.id === diagramTemplateId)?.tagColor || 'adm-chip--purple'}`}
                            style={{ fontSize: '9.5px', padding: '2px 8px' }}
                          >
                            {DIAGRAM_TEMPLATES.find(t => t.id === diagramTemplateId)?.badge || 'Architecture'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b', marginTop: '3px' }}>
                          {customNodes.length} Components · {customLayout === 'hierarchy' ? 'Vertical Hierarchy' : 'Horizontal Pipeline'} · Target: <strong style={{ color: '#f59e0b' }}>{hotspotTarget || 'None selected'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Pop-up Window Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setIsDiagramStudioOpen(true)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)'
                      }}
                      title="Open large pop-up window to customize and preview diagram without scrolling"
                    >
                      <Maximize2 size={15} />
                      <span>Open Diagram Studio & Editor (Pop-Up)</span>
                    </button>
                  </div>

                  {/* Inline Target Component Quick Select Bar */}
                  <div style={{ borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase' }}>
                        Quick Select Target Hotspot:
                      </span>
                      <button
                        type="button"
                        className="trn-link"
                        style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 700 }}
                        onClick={() => setIsDiagramStudioOpen(true)}
                      >
                        Edit Archetypes, Icons & Layers in Pop-Up ➔
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {customNodes.map((node) => {
                        const isTarget = hotspotTarget && hotspotTarget.trim().toLowerCase() === node.title.trim().toLowerCase();
                        return (
                          <button
                            key={node.id || node.title}
                            type="button"
                            onClick={() => setHotspotTarget(node.title)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '7px',
                              border: isTarget
                                ? '1.5px solid #f59e0b'
                                : (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1'),
                              background: isTarget
                                ? '#f59e0b'
                                : (isDark ? '#111827' : '#ffffff'),
                              color: isTarget
                                ? '#ffffff'
                                : (isDark ? '#cbd5e1' : '#475569'),
                              fontSize: '11.5px',
                              fontWeight: isTarget ? 700 : 500,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {isTarget && <span>✓</span>}
                            <span>{node.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Explanation Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase' }}>
                  Optional Explanation / Rubric Citation (Revealed upon quiz completion):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Evaluated per Section 4.2 of NPC Circular 16-03 guidelines."
                  value={newQuestionExplanation}
                  onChange={(e) => setNewQuestionExplanation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
                    background: isDark ? '#0b0f19' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Submit / Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                {editingQuestionId && (
                  <button
                    type="button"
                    onClick={cancelEditing}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #cbd5e1',
                      background: 'transparent',
                      color: isDark ? '#cbd5e1' : '#64748b',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!newQuestionPrompt.trim()}
                  className="adm-btn adm-btn-solid cq-btn--purple"
                  style={{
                    background: editingQuestionId
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 22px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: !newQuestionPrompt.trim() ? 'not-allowed' : 'pointer',
                    boxShadow: editingQuestionId
                      ? '0 4px 14px rgba(16, 185, 129, 0.35)'
                      : '0 4px 14px rgba(124, 58, 237, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {editingQuestionId ? <Check size={16} /> : <Plus size={16} />}
                  <span>{editingQuestionId ? 'Save Question Changes' : 'Add Question to Assessment'}</span>
                </button>
              </div>
            </form>

            {/* =========================================================================
                QUESTION ROSTER LIST (Below Form)
                ========================================================================= */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '28px 0 14px' }}>
              <span className="adm-label" style={{ fontSize: '12px', color: isDark ? '#cbd5e1' : '#334155' }}>
                QUESTION ROSTER ({activeQuiz.questions.length})
              </span>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              {activeQuiz.questions.length === 0 ? (
                <div
                  className="adm-state"
                  style={{
                    padding: '36px 20px',
                    background: isDark ? '#111827' : '#f8fafc',
                    borderRadius: '16px',
                    border: isDark ? '1px dashed rgba(255, 255, 255, 0.12)' : '1px dashed #cbd5e1'
                  }}
                >
                  <HelpCircle size={32} color="#8b5cf6" style={{ margin: '0 auto 10px', display: 'block' }} />
                  <strong>No questions currently in this challenge.</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b' }}>
                    Choose a question format above and click "Add Question to Assessment" to build out the roster.
                  </p>
                </div>
              ) : (
                activeQuiz.questions.map((q, idx) => {
                  const formatInfo = getFormatBadge(q.type);
                  return (
                    <div
                      key={q.id || idx}
                      className="trn-q"
                      style={{
                        background: isDark ? '#111827' : '#ffffff',
                        border: editingQuestionId === q.id
                          ? '2px solid #8b5cf6'
                          : (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid var(--cq-line)'),
                        borderRadius: '16px',
                        padding: '18px 20px',
                        boxShadow: editingQuestionId === q.id
                          ? '0 0 0 2px rgba(139, 92, 246, 0.25), 0 8px 24px rgba(0, 0, 0, 0.25)'
                          : (isDark ? '0 4px 16px rgba(0, 0, 0, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.03)'),
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div className="trn-q__top" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="trn-q__n" style={{ color: '#8b5cf6', fontWeight: 800 }}>
                          #{idx + 1}
                        </span>
                        <span className={`adm-chip ${formatInfo.chip}`} style={{ fontSize: '10px', padding: '3px 8px' }}>
                          {formatInfo.label}
                        </span>
                        {q.approved ? (
                          <span className="adm-chip adm-chip--green" style={{ fontSize: '10px', padding: '2px 8px', fontWeight: 700 }}>
                            ✓ Approved
                          </span>
                        ) : (
                          <span className="adm-chip adm-chip--amber" style={{ fontSize: '10px', padding: '2px 8px', fontWeight: 700 }}>
                            Pending Review
                          </span>
                        )}
                        {editingQuestionId === q.id && (
                          <span className="adm-chip adm-chip--purple" style={{ fontSize: '10px', padding: '2px 8px', fontWeight: 700 }}>
                            Editing
                          </span>
                        )}
                        <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                          <button
                            type="button"
                            className="trn-link"
                            style={{
                              color: q.approved ? '#10b981' : '#f59e0b',
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            onClick={() => handleToggleApproveQuestion(q)}
                            title={q.approved ? 'Question is approved for cohort assessment' : 'Approve question (U-12)'}
                          >
                            <Check size={13} />
                            <span>{q.approved ? 'Approved' : 'Approve'}</span>
                          </button>
                          <button
                            type="button"
                            className="trn-link"
                            style={{
                              color: editingQuestionId === q.id ? '#a78bfa' : (isDark ? '#cbd5e1' : '#475569'),
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: editingQuestionId === q.id ? 700 : 500,
                              cursor: 'pointer'
                            }}
                            onClick={() => startEditingQuestion(q)}
                            title="Edit question prompt, format, options, or explanation"
                          >
                            <Edit3 size={13} />
                            <span>{editingQuestionId === q.id ? 'Editing' : 'Edit'}</span>
                          </button>
                          <button
                            type="button"
                            className="trn-link"
                            style={{ color: '#ef4444', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                            onClick={() => {
                              if (window.confirm('Delete this question from assessment?')) {
                                if (editingQuestionId === q.id) cancelEditing();
                                handleDeleteQuestion(activeQuiz.id, q.id);
                              }
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      <h3 style={{ margin: '10px 0 12px', fontSize: '15px', fontWeight: 700, color: isDark ? '#f8fafc' : '#1e293b', lineHeight: 1.4 }}>
                        {q.prompt}
                      </h3>

                      {/* Kahoot 4-Tile Multiple Choice Options */}
                      {(q.type === 'kahoot' || q.type === 'multiple_choice') && q.options && (
                        <ul className="trn-tiles" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {q.options.map((opt, oi) => {
                            const isCorrect = oi === q.answer;
                            return (
                              <li
                                key={oi}
                                className={isCorrect ? 'ok' : ''}
                                style={{
                                  background: isCorrect
                                    ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5')
                                    : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'),
                                  color: isCorrect
                                    ? (isDark ? '#34d399' : '#065f46')
                                    : (isDark ? '#cbd5e1' : '#334155'),
                                  border: isCorrect
                                    ? '1px solid rgba(16, 185, 129, 0.4)'
                                    : (isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0'),
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontSize: '12.5px',
                                  fontWeight: 600
                                }}
                              >
                                <span>{String.fromCharCode(65 + oi)}.</span>
                                <span style={{ flex: 1 }}>{opt}</span>
                                {isCorrect && <Check size={14} color="#10b981" />}
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {/* Matching Pairs */}
                      {q.type === 'matching' && q.pairs && (
                        <div style={{ display: 'grid', gap: '6px', marginTop: '8px' }}>
                          {q.pairs.map((pair, pi) => (
                            <div
                              key={pi}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 12px',
                                background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                                borderRadius: '8px',
                                border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
                                fontSize: '12.5px'
                              }}
                            >
                              <span style={{ fontWeight: 700, color: isDark ? '#38bdf8' : '#0284c7', minWidth: '180px' }}>
                                {pair.left}
                              </span>
                              <span style={{ color: '#8b5cf6', fontWeight: 800 }}>➔</span>
                              <span style={{ color: isDark ? '#e2e8f0' : '#334155', flex: 1 }}>
                                {pair.right}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Identification */}
                      {q.accepted && (
                        <div style={{ fontSize: '13px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="adm-soft" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                            Accepted Answers:
                          </span>
                          <span style={{ fontWeight: 700, color: isDark ? '#fcd34d' : '#d97706', background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7', padding: '2px 8px', borderRadius: '6px' }}>
                            {q.accepted.join(' · ')}
                          </span>
                        </div>
                      )}

                      {/* Sequence Order */}
                      {q.steps && (
                        <ol className="trn-steps" style={{ margin: '8px 0 0', paddingLeft: '20px', display: 'grid', gap: '4px', fontSize: '13px', color: isDark ? '#cbd5e1' : '#334155' }}>
                          {q.steps.map((s, si) => (
                            <li key={si} style={{ fontWeight: 500 }}>{s}</li>
                          ))}
                        </ol>
                      )}

                      {/* Diagram Hotspot Details & Resulting Diagram Render */}
                      {(q.type === 'hotspot' || q.type === 'diagram_analysis') && (
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="adm-soft" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                              Archetype:
                            </span>
                            <span className="adm-chip adm-chip--purple" style={{ fontSize: '10.5px' }}>
                              {DIAGRAM_TEMPLATES.find(t => t.id === (q.diagramType || 'security_pipeline'))?.name || (q.diagramType || 'Sequential Process Pipeline')}
                            </span>
                            <span className="adm-soft" style={{ color: isDark ? '#94a3b8' : '#64748b', marginLeft: '6px' }}>
                              Target Component:
                            </span>
                            <span style={{ fontWeight: 700, color: isDark ? '#fb923c' : '#ea580c', background: isDark ? 'rgba(234, 88, 12, 0.15)' : '#ffedd5', padding: '2px 8px', borderRadius: '6px' }}>
                              {q.answerLabel || 'Target Node'}
                            </span>
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                type="button"
                                className="trn-link"
                                style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#8b5cf6', fontWeight: 700 }}
                                onClick={() => setViewerModalQuestion(q)}
                                title="Open large pop-up window to view diagram clearly"
                              >
                                <Maximize2 size={12} />
                                <span>View Large Pop-Up</span>
                              </button>
                              <button
                                type="button"
                                className="trn-link"
                                style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: isDark ? '#94a3b8' : '#64748b' }}
                                onClick={() => {
                                  const qKey = q.id || idx;
                                  setRosterDiagramToggles(prev => ({ ...prev, [qKey]: prev[qKey] === false ? true : false }));
                                }}
                              >
                                {rosterDiagramToggles[q.id || idx] === false ? <Eye size={12} /> : <EyeOff size={12} />}
                                <span>{rosterDiagramToggles[q.id || idx] === false ? 'Expand' : 'Collapse'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Resulting Diagram is shown directly by default */}
                          {rosterDiagramToggles[q.id || idx] !== false && (
                            <div style={{ borderRadius: '14px', overflow: 'hidden' }}>
                              <QuizDiagram
                                type={q.diagramType || 'security_pipeline'}
                                customTitle={q.diagramTitle}
                                customNodes={q.customNodes}
                                customLayout={q.customLayout}
                                targetNode={q.answerLabel}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Explanation */}
                      {q.explanation && (
                        <div style={{ marginTop: '10px', fontSize: '11.5px', color: isDark ? '#94a3b8' : '#64748b', fontStyle: 'italic', borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #f1f5f9', paddingTop: '8px' }}>
                          💡 <strong>Citation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="adm-state">Select an assessment from the left panel to edit its question roster.</div>
        )}
      </div>

      {/* =========================================================================
          DECENTLY BIG DIAGRAM STUDIO & EDITOR POP-UP WINDOW
          ========================================================================= */}
      <DiagramStudioModal
        isOpen={isDiagramStudioOpen}
        onClose={() => setIsDiagramStudioOpen(false)}
        templates={DIAGRAM_TEMPLATES}
        diagramTemplateId={diagramTemplateId}
        onSelectTemplate={handleSelectTemplate}
        customDiagramTitle={customDiagramTitle}
        onChangeTitle={setCustomDiagramTitle}
        customLayout={customLayout}
        onChangeLayout={setCustomLayout}
        customNodes={customNodes}
        onAddNode={handleAddCustomNode}
        onRemoveNode={handleRemoveCustomNode}
        onMoveNode={handleMoveCustomNode}
        onUpdateNode={handleUpdateCustomNode}
        hotspotTarget={hotspotTarget}
        onSelectTarget={setHotspotTarget}
        isDark={isDark}
      />

      {/* READ-ONLY VIEW MODAL FOR ROSTER DIAGRAMS */}
      {viewerModalQuestion && (
        <DiagramStudioModal
          isOpen={Boolean(viewerModalQuestion)}
          onClose={() => setViewerModalQuestion(null)}
          templates={DIAGRAM_TEMPLATES}
          diagramTemplateId={viewerModalQuestion.diagramType || 'security_pipeline'}
          customDiagramTitle={viewerModalQuestion.diagramTitle}
          customLayout={viewerModalQuestion.customLayout || 'pipeline'}
          customNodes={viewerModalQuestion.customNodes || DIAGRAM_TEMPLATES.find(t => t.id === viewerModalQuestion.diagramType)?.defaultNodes}
          hotspotTarget={viewerModalQuestion.answerLabel}
          isDark={isDark}
          readOnly={true}
        />
      )}
    </div>
  );
}
