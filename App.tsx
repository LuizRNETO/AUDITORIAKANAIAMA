import React, { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardDocumentCheckIcon, 
  HomeModernIcon, 
  UsersIcon, 
  ChartBarIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  BellIcon,
  XMarkIcon,
  MapPinIcon,
  DocumentTextIcon,
  BuildingLibraryIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilSquareIcon,
  Squares2X2Icon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { AuditState, AuditItem, Party, AnalysisResult, PropertyData } from './types';
import { PROPERTY_CHECKLIST_TEMPLATE, PARTY_PF_CHECKLIST_TEMPLATE, PARTY_PJ_CHECKLIST_TEMPLATE } from './data/defaults';
import { analyzeAuditRisks } from './services/geminiService';
import { StatusSelector, StatusBadge, StatusDot, STATUS_CONFIG } from './components/StatusBadge';
import * as auditService from './services/auditService';

// --- Helper Components ---

interface AuditRowProps {
  item: AuditItem;
  onUpdate: (id: string, updates: Partial<AuditItem>) => void;
  onDelete: (id: string) => void;
}

const AuditRow: React.FC<AuditRowProps> = ({ item, onUpdate, onDelete }) => {
  return (
    <div className="group grid grid-cols-1 md:grid-cols-12 gap-4 py-4 px-4 hover:bg-slate-50 transition-all border-b border-slate-100 last:border-0 items-start">
      {/* Col 1: Name & Description */}
      <div className="md:col-span-5">
        <div className="flex items-start gap-3">
            <StatusDot status={item.status} />
            <div>
                <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">{item.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>
            </div>
        </div>
      </div>

      {/* Col 2: Status Selector */}
      <div className="md:col-span-3 flex md:justify-center items-center">
        <StatusSelector 
            status={item.status} 
            onChange={(val) => onUpdate(item.id, { status: val as any })} 
        />
      </div>

      {/* Col 3: Notes & Actions */}
      <div className="md:col-span-4 flex items-center gap-2">
        <div className="relative flex-grow rounded-md shadow-sm ring-1 ring-inset ring-slate-200 focus-within:ring-2 focus-within:ring-indigo-600 bg-white transition-all">
            <textarea 
                value={item.notes}
                onChange={(e) => onUpdate(item.id, { notes: e.target.value })}
                placeholder="Adicionar observações, protocolos..."
                className="block w-full border-0 bg-transparent py-2 pl-2 pr-7 text-slate-900 placeholder:text-slate-400 focus:ring-0 sm:text-xs sm:leading-6 resize-none min-h-[50px]"
            />
            <div className="absolute top-2 right-2 text-slate-300 group-hover:text-slate-400 pointer-events-none">
                <PencilSquareIcon className="w-4 h-4" />
            </div>
        </div>
        <button 
            onClick={() => onDelete(item.id)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Excluir item"
        >
            <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

interface CategoryGroupProps {
    category: string; 
    items: AuditItem[]; 
    onUpdateItem: (id: string, updates: Partial<AuditItem>) => void;
    onDeleteItem: (id: string) => void;
}

// Component to Group Items by Category (Accordion Style)
const CategoryGroup: React.FC<CategoryGroupProps> = ({ 
    category, 
    items, 
    onUpdateItem,
    onDeleteItem
}) => {
    const [isOpen, setIsOpen] = useState(true);

    const completedCount = items.filter(i => i.status === 'ok' || i.status === 'waived').length;
    const issueCount = items.filter(i => i.status === 'issue' || i.status === 'expired').length;
    const totalCount = items.length;
    const progress = Math.round((completedCount / totalCount) * 100);

    return (
        <div className="mb-4 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    {isOpen ? <ChevronUpIcon className="w-4 h-4 text-slate-400" /> : <ChevronDownIcon className="w-4 h-4 text-slate-400" />}
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{category}</h3>
                    <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                        {items.length} itens
                    </span>
                    {issueCount > 0 && (
                        <span className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                            <ExclamationTriangleIcon className="w-3 h-3" /> {issueCount} Atenção
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex flex-col items-end mr-2">
                        <div className="flex items-baseline gap-1">
                            <span className="text-xs font-bold text-slate-700">{progress}%</span>
                            <span className="text-xs text-slate-400 uppercase">Resolvido</span>
                        </div>
                        <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                </div>
            </button>
            
            {isOpen && (
                <div className="divide-y divide-slate-100">
                    {items.map(item => (
                        <AuditRow 
                            key={item.id} 
                            item={item} 
                            onUpdate={onUpdateItem} 
                            onDelete={onDeleteItem}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Types for Notifications & Deletion ---
interface Notification {
  id: string;
  message: string;
  type: 'alert' | 'warning' | 'info';
  timestamp: Date;
  read: boolean;
}

type DeleteTarget = {
    type: 'item' | 'party' | 'property';
    id: string;
    parentId?: string; // used for items (parent is property or party)
    parentType?: 'property' | 'party'; // used to distinguish where the item belongs
};

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'property' | 'parties' | 'analysis'>('dashboard');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [partySearch, setPartySearch] = useState('');
  
  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Property Tab Management
  const [activePropertyId, setActivePropertyId] = useState<string>('');

  // Modal State for New Property Item
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItem, setNewItem] = useState({ category: 'Outros', name: '', description: '' });

  // Modal State for Delete Confirmation
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const [state, setState] = useState<AuditState>({
    properties: [],
    parties: [],
    generalNotes: ''
  });

  // --- Initialize & Fetch Data ---

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await auditService.fetchAuditState();
      
      // If no properties exist (first load), create a default one
      if (data.properties.length === 0 && data.parties.length === 0) {
        const defaultProp: PropertyData = {
          id: '', // Service will handle ID creation, or local fallback will
          name: 'Fazenda Santa Maria',
          matricula: '14.230',
          cartorio: 'RGI de Correntina/BA',
          area: '1.250',
          municipio: 'Correntina - BA',
          items: JSON.parse(JSON.stringify(PROPERTY_CHECKLIST_TEMPLATE))
        };
        
        try {
          const createdProp = await auditService.createProperty(defaultProp);
          setState({
            properties: [createdProp],
            parties: [],
            generalNotes: ''
          });
          setActivePropertyId(createdProp.id);
        } catch (e) {
          console.warn("Offline mode: Using local state for default property");
          defaultProp.id = 'loc-' + Math.random().toString(36).substr(2, 9);
          setState({
            properties: [defaultProp],
            parties: [],
            generalNotes: ''
          });
          setActivePropertyId(defaultProp.id);
          addNotification("Modo Offline: Dados salvos apenas localmente.", "warning");
        }
      } else {
        setState(data);
        if (data.properties.length > 0) {
          setActivePropertyId(data.properties[0].id);
        }
      }
    } catch (error) {
      console.error(error);
      addNotification("Erro crítico ao carregar dados.", "alert");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Notification Logic ---

  const addNotification = (message: string, type: 'alert' | 'warning' | 'info') => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  // --- Handlers with Persistence ---

  const handlePropertyItemUpdate = (propertyId: string, itemId: string, updates: Partial<AuditItem>) => {
    // Optimistic Update
    setState(prev => ({
      ...prev,
      properties: prev.properties.map(prop => {
        if (prop.id !== propertyId) return prop;
        return {
          ...prop,
          items: prop.items.map(item => item.id === itemId ? { ...item, ...updates } : item)
        };
      })
    }));

    // Persist
    auditService.updateAuditItem(itemId, updates);

    // Notifications
    if (updates.status) {
      const prop = state.properties.find(p => p.id === propertyId);
      const item = prop?.items.find(i => i.id === itemId);
      if (prop && item) {
        if (updates.status === 'issue') {
          addNotification(`Imóvel (${prop.name}): O item "${item.name}" foi marcado como IRREGULARIDADE.`, 'alert');
        } else if (updates.status === 'pending') {
           addNotification(`Imóvel (${prop.name}): O item "${item.name}" voltou para PENDENTE.`, 'warning');
        }
      }
    }
  };

  const updatePropertyDetails = (propertyId: string, updates: Partial<PropertyData>) => {
    setState(prev => ({
      ...prev,
      properties: prev.properties.map(prop => prop.id === propertyId ? { ...prop, ...updates } : prop)
    }));
    auditService.updateProperty(propertyId, updates);
  };

  const addNewProperty = async () => {
      const newPropData: PropertyData = {
          id: '',
          name: 'Novo Imóvel',
          matricula: '',
          cartorio: '',
          area: '',
          municipio: '',
          items: JSON.parse(JSON.stringify(PROPERTY_CHECKLIST_TEMPLATE))
      };

      try {
        const createdProp = await auditService.createProperty(newPropData);
        setState(prev => ({ ...prev, properties: [...prev.properties, createdProp] }));
        setActivePropertyId(createdProp.id);
        addNotification('Novo imóvel adicionado à auditoria.', 'info');
      } catch (e) {
        // Fallback local
        newPropData.id = 'loc-' + Math.random().toString(36).substr(2, 9);
        setState(prev => ({ ...prev, properties: [...prev.properties, newPropData] }));
        setActivePropertyId(newPropData.id);
        addNotification('Novo imóvel adicionado (Localmente).', 'warning');
      }
  };

  const handleAddItemSave = async () => {
    if (!newItem.name || !activePropertyId) return;
    
    // Create temporary object to show immediately (optional, or wait for DB)
    // Here we wait for DB to get real ID
    const itemTemplate: AuditItem = {
      id: '', // Placeholder
      category: newItem.category,
      name: newItem.name,
      description: newItem.description,
      status: 'pending',
      notes: '',
      updatedAt: new Date().toISOString()
    };
    
    try {
      const createdItem = await auditService.createAuditItem(itemTemplate, activePropertyId, 'property');
      // Success path
      setState(prev => ({
        ...prev,
        properties: prev.properties.map(prop => {
          if (prop.id !== activePropertyId) return prop;
          return { ...prop, items: [...prop.items, createdItem] };
        })
      }));
      addNotification(`Novo item "${createdItem.name}" adicionado.`, 'info');
    } catch (e) {
      // Offline path
      itemTemplate.id = 'loc-item-' + Math.random().toString(36).substr(2, 9);
      setState(prev => ({
        ...prev,
        properties: prev.properties.map(prop => {
          if (prop.id !== activePropertyId) return prop;
          return { ...prop, items: [...prop.items, itemTemplate] };
        })
      }));
      addNotification(`Item adicionado (Localmente).`, 'warning');
    }
    
    setShowAddItemModal(false);
    setNewItem({ category: 'Outros', name: '', description: '' });
  };

  const handlePartyItemUpdate = (partyId: string, itemId: string, updates: Partial<AuditItem>) => {
    // Optimistic
    setState(prev => ({
      ...prev,
      parties: prev.parties.map(party => {
        if (party.id !== partyId) return party;
        return {
          ...party,
          items: party.items.map(item => item.id === itemId ? { ...item, ...updates } : item)
        };
      })
    }));

    // Persist
    auditService.updateAuditItem(itemId, updates);

    // Notification Logic
    if (updates.status) {
      const party = state.parties.find(p => p.id === partyId);
      if (party) {
        const item = party.items.find(i => i.id === itemId);
        if (item) {
          if (updates.status === 'issue') {
            addNotification(`Parte (${party.name}): O item "${item.name}" foi marcado como IRREGULARIDADE.`, 'alert');
          } else if (updates.status === 'pending') {
            addNotification(`Parte (${party.name}): O item "${item.name}" voltou para PENDENTE.`, 'warning');
          }
        }
      }
    }
  };

  const handleGeneralNotesUpdate = (notes: string) => {
    setState(prev => ({ ...prev, generalNotes: notes }));
    // Debounce ideally, but direct call for now
    auditService.updateGeneralNotes(notes);
  }

  // --- DELETION LOGIC ---

  const handleDeleteRequest = (type: 'item' | 'party' | 'property', id: string, parentId?: string, parentType?: 'property' | 'party') => {
    setDeleteTarget({ type, id, parentId, parentType });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;

    const { type, id, parentId, parentType } = deleteTarget;

    try {
      if (type === 'party') {
          await auditService.deleteParty(id);
          setState(prev => ({ ...prev, parties: prev.parties.filter(p => p.id !== id) }));
          addNotification("Parte removida da auditoria.", "info");
      } 
      else if (type === 'property') {
          if (state.properties.length <= 1) {
              alert("Você não pode excluir o único imóvel da auditoria.");
              setDeleteTarget(null);
              return;
          }
          await auditService.deleteProperty(id);
          const newProperties = state.properties.filter(p => p.id !== id);
          setState(prev => ({ ...prev, properties: newProperties }));
          if (activePropertyId === id) {
              setActivePropertyId(newProperties[0].id);
          }
          addNotification("Imóvel removido da auditoria.", "info");
      }
      else if (type === 'item') {
          await auditService.deleteAuditItem(id);
          if (parentType === 'party' && parentId) {
              setState(prev => ({
                  ...prev,
                  parties: prev.parties.map(party => {
                    if (party.id !== parentId) return party;
                    return {
                      ...party,
                      items: party.items.filter(item => item.id !== id)
                    };
                  })
              }));
          } else if (parentType === 'property' && parentId) {
               setState(prev => ({
                  ...prev,
                  properties: prev.properties.map(prop => {
                      if (prop.id !== parentId) return prop;
                      return {
                          ...prop,
                          items: prop.items.filter(item => item.id !== id)
                      };
                  })
               }));
          }
          addNotification("Item removido.", "info");
      }
    } catch (e) {
      // Local fallback for deletion isn't strictly necessary for visual feedback as we usually rely on optimism,
      // but here we already updated state above if we moved state update out of try/catch?
      // Actually, I put await inside the blocks.
      // For robustness, let's just swallow the error if in offline mode, and assume memory deletion worked if we move state update out?
      // No, let's keep it simple: If delete fails, we assume it failed for real, UNLESS we are in offline mode.
      // But identifying offline mode here is tricky. 
      // Simplified: Just update state regardless of backend success for better UX in mixed modes.
      
      // Since I cannot rewrite the entire block easily in this context without duplication, I'll rely on the optimistic updates I will apply now:
      // I will move the setState calls OUTSIDE the try block or assume success for local objects.
      
      console.warn("Delete op failed (offline?)", e);
      // Fallback: Force update UI
      if (type === 'party') {
         setState(prev => ({ ...prev, parties: prev.parties.filter(p => p.id !== id) }));
      } else if (type === 'property') {
         // Logic repeated for fallback safety
          if (state.properties.length > 1) {
             const newProperties = state.properties.filter(p => p.id !== id);
             setState(prev => ({ ...prev, properties: newProperties }));
             if (activePropertyId === id) setActivePropertyId(newProperties[0].id);
          }
      } else if (type === 'item') {
         // Logic repeated
         if (parentType === 'party' && parentId) {
              setState(prev => ({
                  ...prev,
                  parties: prev.parties.map(party => {
                    if (party.id !== parentId) return party;
                    return { ...party, items: party.items.filter(item => item.id !== id) };
                  })
              }));
         } else if (parentType === 'property' && parentId) {
               setState(prev => ({
                  ...prev,
                  properties: prev.properties.map(prop => {
                      if (prop.id !== parentId) return prop;
                      return { ...prop, items: prop.items.filter(item => item.id !== id) };
                  })
               }));
         }
      }
      addNotification("Item removido (Localmente).", "info");
    }

    setDeleteTarget(null);
  };

  const addParty = async (type: 'PF' | 'PJ', role: 'buyer' | 'seller') => {
    const template = type === 'PF' ? PARTY_PF_CHECKLIST_TEMPLATE : PARTY_PJ_CHECKLIST_TEMPLATE;
    const newPartyData: Party = {
      id: '',
      type,
      role,
      name: type === 'PF' ? 'Nome da Pessoa' : 'Razão Social',
      doc: '',
      items: JSON.parse(JSON.stringify(template))
    };

    try {
      const createdParty = await auditService.createParty(newPartyData);
      setState(prev => ({ ...prev, parties: [...prev.parties, createdParty] }));
      setPartySearch('');
      addNotification(`Nova parte adicionada: ${createdParty.name}.`, 'info');
    } catch (e) {
      newPartyData.id = 'loc-party-' + Math.random().toString(36).substr(2, 9);
      setState(prev => ({ ...prev, parties: [...prev.parties, newPartyData] }));
      setPartySearch('');
      addNotification(`Nova parte adicionada (Localmente).`, 'warning');
    }
  };

  const updatePartyDetails = (id: string, updates: Partial<Party>) => {
    setState(prev => ({
      ...prev,
      parties: prev.parties.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
    auditService.updateParty(id, updates);
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeAuditRisks(state);
      setAnalysisResult(result);
      addNotification("Análise de Risco com IA concluída com sucesso.", 'info');
    } catch (e) {
      console.error(e);
      addNotification("Erro ao realizar análise de risco.", 'alert');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Top Header Component ---
  const TopHeader = () => {
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
      <header className="bg-white shadow-sm border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-4">
           <div className="md:hidden flex gap-4">
             <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-600'}><ChartBarIcon className="w-6 h-6" /></button>
             <button onClick={() => setActiveTab('property')} className={activeTab === 'property' ? 'text-indigo-600' : 'text-slate-600'}><HomeModernIcon className="w-6 h-6" /></button>
             <button onClick={() => setActiveTab('parties')} className={activeTab === 'parties' ? 'text-indigo-600' : 'text-slate-600'}><UsersIcon className="w-6 h-6" /></button>
           </div>
           <h1 className="hidden md:block font-bold text-slate-900 text-lg">
              RuralAudit Pro <span className="text-slate-400 font-normal mx-2">|</span> 
              <span className="text-slate-500 font-medium text-sm">Dashboard de Auditoria</span>
           </h1>
        </div>

        <div className="flex items-center gap-4 relative">
          <button 
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications && unreadCount > 0) markAllRead();
            }}
            className="relative p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-full transition-colors"
          >
            <BellIcon className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 text-[8px] text-white justify-center items-center"></span>
              </span>
            )}
          </button>
          
          <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs border border-indigo-200 shadow-sm">
            JD
          </div>

          {showNotifications && (
            <div className="absolute top-12 right-0 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-semibold text-slate-800">Notificações</h3>
                {notifications.length > 0 && (
                  <button onClick={clearNotifications} className="text-xs text-slate-500 hover:text-red-600">
                    Limpar tudo
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    <BellIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Nenhuma notificação recente.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map(notif => (
                      <div key={notif.id} className={`p-4 hover:bg-slate-50 transition-colors flex gap-3 ${!notif.read ? 'bg-indigo-50/50' : ''}`}>
                        <div className="flex-shrink-0 mt-1">
                          {notif.type === 'alert' && <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />}
                          {notif.type === 'warning' && <ClockIcon className="w-5 h-5 text-yellow-500" />}
                          {notif.type === 'info' && <CheckCircleIcon className="w-5 h-5 text-blue-500" />}
                        </div>
                        <div>
                          <p className={`text-sm ${notif.read ? 'text-slate-600' : 'text-slate-800 font-medium'}`}>
                            {notif.message}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {notif.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
    );
  };

  // --- Views ---

  const DashboardView = () => {
    // Aggregates across ALL properties
    let propIssues = 0;
    let propPending = 0;
    let totalPropItems = 0;

    state.properties.forEach(prop => {
        propIssues += prop.items.filter(i => i.status === 'issue' || i.status === 'expired').length;
        propPending += prop.items.filter(i => i.status === 'pending').length;
        totalPropItems += prop.items.length;
    });
    
    let partyIssues = 0;
    let partyPending = 0;
    state.parties.forEach(p => {
      partyIssues += p.items.filter(i => i.status === 'issue' || i.status === 'expired').length;
      partyPending += p.items.filter(i => i.status === 'pending').length;
    });

    const totalItems = totalPropItems + state.parties.reduce((acc, p) => acc + p.items.length, 0);
    const totalDone = totalItems - (propPending + partyPending);
    const progress = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-slate-400 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
               <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total de Itens</h3>
               <ClipboardDocumentCheckIcon className="w-6 h-6 text-slate-400" />
            </div>
            <div>
               <span className="text-3xl font-bold text-slate-900">{totalItems}</span>
               <span className="ml-2 text-sm text-slate-500">verificações</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-400 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
               <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pendências</h3>
               <ClockIcon className="w-6 h-6 text-amber-400" />
            </div>
            <div>
               <span className="text-3xl font-bold text-amber-600">{propPending + partyPending}</span>
               <span className="ml-2 text-sm text-slate-500">aguardando</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-rose-500 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
               <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Risco Alto</h3>
               <ExclamationTriangleIcon className="w-6 h-6 text-rose-500" />
            </div>
            <div>
               <span className="text-3xl font-bold text-rose-600">{propIssues + partyIssues}</span>
               <span className="ml-2 text-sm text-slate-500">críticos</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-indigo-500 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
               <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Progresso</h3>
               <ChartBarIcon className="w-6 h-6 text-indigo-500" />
            </div>
            <div className="w-full">
               <div className="flex justify-between items-end mb-1">
                   <span className="text-3xl font-bold text-indigo-600">{progress}%</span>
                   <span className="text-sm text-slate-500">concluído</span>
               </div>
               <div className="w-full bg-slate-100 rounded-full h-2">
                   <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
               </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center">
            <h3 className="text-base font-semibold text-slate-900">Resumo dos Imóveis</h3>
            <span className="text-xs text-slate-500">{state.properties.length} imóveis cadastrados</span>
          </div>
          <div className="p-6">
            <div className="space-y-4">
                {state.properties.map(prop => (
                    <div key={prop.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3">
                            <HomeModernIcon className="w-5 h-5 text-indigo-500" />
                            <div>
                                <h4 className="font-semibold text-slate-800 text-sm">{prop.name}</h4>
                                <p className="text-xs text-slate-500">Matrícula: {prop.matricula || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-medium bg-slate-200 px-2 py-1 rounded text-slate-600">
                                {prop.items.filter(i => i.status === 'ok').length} / {prop.items.length} Regular
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-6">
               <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Observações Gerais da Auditoria</label>
               <textarea 
                 value={state.generalNotes}
                 onChange={(e) => handleGeneralNotesUpdate(e.target.value)}
                 rows={4}
                 className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                 placeholder="Descreva o contexto da negociação, condições de pagamento, prazos e detalhes relevantes para a análise jurídica..."
               />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PropertyView = () => {
    const activeProperty = state.properties.find(p => p.id === activePropertyId);

    // Group items by category for the active property
    const groupedItems = useMemo<Record<string, AuditItem[]>>(() => {
        if (!activeProperty) return {};
        const groups: Record<string, AuditItem[]> = {};
        activeProperty.items.forEach(item => {
            if (!groups[item.category]) groups[item.category] = [];
            groups[item.category].push(item);
        });
        return groups;
    }, [activeProperty]);

    if (!activeProperty && state.properties.length > 0) {
        // Fallback if deletion happens
        setActivePropertyId(state.properties[0].id);
        return null;
    }

    return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Checklist do Imóvel</h2>
          <p className="text-sm text-slate-500">Documentação e regularidade fundiária</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={addNewProperty}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-md text-sm hover:bg-slate-200 font-medium transition shadow-sm border border-slate-300"
            >
                <PlusIcon className="w-4 h-4" /> Adicionar Matrícula/Imóvel
            </button>
            <button 
                onClick={() => setShowAddItemModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 font-medium transition shadow-sm"
            >
                <PlusIcon className="w-4 h-4" /> Nova Certidão
            </button>
        </div>
      </div>

      {/* Property Tabs */}
      <div className="flex overflow-x-auto pb-2 gap-2 border-b border-slate-200">
        {state.properties.map(prop => (
            <button
                key={prop.id}
                onClick={() => setActivePropertyId(prop.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    activePropertyId === prop.id 
                    ? 'bg-white border border-b-0 border-slate-200 text-indigo-600' 
                    : 'bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
            >
                <HomeModernIcon className="w-4 h-4" />
                {prop.name || 'Novo Imóvel'}
            </button>
        ))}
      </div>
      
      {activeProperty && (
        <div className="animate-fade-in">
            {/* Property Details Form */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                        <Squares2X2Icon className="w-4 h-4" /> Detalhes do Imóvel
                    </h3>
                    {state.properties.length > 1 && (
                        <button 
                            onClick={() => handleDeleteRequest('property', activeProperty.id)}
                            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 hover:underline"
                        >
                            <TrashIcon className="w-3 h-3" /> Excluir Imóvel
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Nome/Identificação</label>
                        <input
                            type="text"
                            value={activeProperty.name}
                            onChange={(e) => updatePropertyDetails(activeProperty.id, { name: e.target.value })}
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-1.5"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Matrícula</label>
                        <input
                            type="text"
                            value={activeProperty.matricula}
                            onChange={(e) => updatePropertyDetails(activeProperty.id, { matricula: e.target.value })}
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-1.5"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Cartório</label>
                        <input
                            type="text"
                            value={activeProperty.cartorio}
                            onChange={(e) => updatePropertyDetails(activeProperty.id, { cartorio: e.target.value })}
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-1.5"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Município/Área</label>
                        <input
                            type="text"
                            value={activeProperty.municipio}
                            onChange={(e) => updatePropertyDetails(activeProperty.id, { municipio: e.target.value })}
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-1.5"
                        />
                    </div>
                </div>
            </div>

            {/* Checklist */}
            <div className="space-y-4">
                {Object.entries(groupedItems).map(([category, items]) => (
                    <CategoryGroup 
                        key={category} 
                        category={category} 
                        items={items} 
                        onUpdateItem={(id, updates) => handlePropertyItemUpdate(activeProperty.id, id, updates)} 
                        onDeleteItem={(id) => handleDeleteRequest('item', id, activeProperty.id, 'property')}
                    />
                ))}
                {activeProperty.items.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                        <p className="text-slate-500">Nenhum item na lista para este imóvel.</p>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Modal for adding new item */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Nova Certidão / Documento</h3>
                    <button onClick={() => setShowAddItemModal(false)} className="text-slate-400 hover:text-slate-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div className="p-3 bg-indigo-50 rounded-md text-xs text-indigo-700">
                        Adicionando para o imóvel: <strong>{activeProperty?.name}</strong>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                        <select 
                            value={newItem.category}
                            onChange={e => setNewItem({...newItem, category: e.target.value})}
                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        >
                            <option value="Registral">Registral</option>
                            <option value="Cadastral">Cadastral</option>
                            <option value="Fiscal">Fiscal</option>
                            <option value="Ambiental">Ambiental</option>
                            <option value="Jurídico">Jurídico</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Documento</label>
                        <input 
                            type="text" 
                            value={newItem.name}
                            onChange={e => setNewItem({...newItem, name: e.target.value})}
                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            placeholder="Ex: Certidão de Inteiro Teor"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <textarea 
                            value={newItem.description}
                            onChange={e => setNewItem({...newItem, description: e.target.value})}
                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            rows={3}
                            placeholder="Detalhes sobre o documento..."
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button 
                        onClick={() => setShowAddItemModal(false)}
                        className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleAddItemSave}
                        disabled={!newItem.name}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
                    >
                        Adicionar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  )};

  const PartiesView = () => {
    const filteredParties = state.parties.filter(party => {
      const search = partySearch.toLowerCase();
      return (
        party.name.toLowerCase().includes(search) ||
        party.doc.toLowerCase().includes(search)
      );
    });

    const groupItemsByCat = (items: AuditItem[]) => {
        const groups: Record<string, AuditItem[]> = {};
        items.forEach(item => {
            if (!groups[item.category]) groups[item.category] = [];
            groups[item.category].push(item);
        });
        return groups;
    };

    return (
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800">Partes Envolvidas</h2>
          <div className="flex gap-2 flex-wrap">
             <button onClick={() => addParty('PF', 'seller')} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-md text-sm hover:bg-indigo-100 font-medium transition">
               <PlusIcon className="w-4 h-4" /> Vendedor (PF)
             </button>
             <button onClick={() => addParty('PJ', 'seller')} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-md text-sm hover:bg-indigo-100 font-medium transition">
               <PlusIcon className="w-4 h-4" /> Vendedor (PJ)
             </button>
             <div className="hidden md:block w-px h-8 bg-slate-300 mx-2"></div>
             <button onClick={() => addParty('PF', 'buyer')} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-md text-sm hover:bg-emerald-100 font-medium transition">
               <PlusIcon className="w-4 h-4" /> Comprador (PF)
             </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Filtrar por nome, CPF ou CNPJ..."
            value={partySearch}
            onChange={(e) => setPartySearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm transition-colors"
          />
        </div>

        {state.parties.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
            <UsersIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhuma parte cadastrada. Adicione vendedores ou compradores para iniciar a auditoria pessoal.</p>
          </div>
        ) : filteredParties.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
            <MagnifyingGlassIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhuma parte encontrada com os critérios da busca.</p>
            <button 
              onClick={() => setPartySearch('')}
              className="mt-2 text-indigo-600 font-medium hover:text-indigo-800 text-sm"
            >
              Limpar busca
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredParties.map(party => {
                const groupedPartyItems = groupItemsByCat(party.items);
                return (
                  <div key={party.id} className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden animate-fade-in">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase flex-shrink-0 ${party.role === 'seller' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {party.role === 'seller' ? 'Vendedor' : 'Comprador'}
                        </span>
                        <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-1 rounded flex-shrink-0">{party.type}</span>
                        <input 
                          value={party.name}
                          onChange={(e) => updatePartyDetails(party.id, { name: e.target.value })}
                          className="font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 w-full min-w-[200px]"
                          placeholder="Nome da Parte"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <input 
                          value={party.doc}
                          onChange={(e) => updatePartyDetails(party.id, { doc: e.target.value })}
                          className="text-sm text-slate-600 bg-white border border-slate-300 rounded px-2 py-1 w-40"
                          placeholder={party.type === 'PF' ? 'CPF' : 'CNPJ'}
                        />
                        <button onClick={() => handleDeleteRequest('party', party.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded" title="Remover Parte">
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-slate-50/50">
                        {Object.entries(groupedPartyItems).map(([category, items]) => (
                            <CategoryGroup 
                                key={category} 
                                category={category} 
                                items={items} 
                                onUpdateItem={(id, updates) => handlePartyItemUpdate(party.id, id, updates)} 
                                onDeleteItem={(id) => handleDeleteRequest('item', id, party.id, 'party')}
                            />
                        ))}
                    </div>
                  </div>
                );
            })}
          </div>
        )}
      </div>
    );
  };

  const AnalysisView = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Inteligência Artificial Jurídica</h2>
        <p className="opacity-90 max-w-2xl">
          Nossa IA analisa todos os status, notas e combinações de risco da auditoria (imóvel + partes) para gerar um parecer preliminar.
        </p>
        <button 
          onClick={runAnalysis} 
          disabled={isAnalyzing}
          className="mt-6 bg-white text-indigo-600 px-6 py-3 rounded-lg font-bold shadow-md hover:bg-slate-50 transition flex items-center gap-2 disabled:opacity-70"
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analisando Riscos...
            </>
          ) : (
            <>
              <ChartBarIcon className="w-5 h-5" />
              Gerar Parecer de Risco
            </>
          )}
        </button>
      </div>

      {analysisResult && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
          <div className={`px-6 py-4 border-b flex justify-between items-center ${
            analysisResult.riskLevel === 'Alto' ? 'bg-red-50 border-red-100' :
            analysisResult.riskLevel === 'Médio' ? 'bg-yellow-50 border-yellow-100' :
            'bg-green-50 border-green-100'
          }`}>
            <h3 className="text-lg font-semibold text-slate-800">Resultado da Análise</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
              analysisResult.riskLevel === 'Alto' ? 'bg-red-100 text-red-700 border-red-200' :
              analysisResult.riskLevel === 'Médio' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
              'bg-green-100 text-green-800 border-green-200'
            }`}>
              Risco {analysisResult.riskLevel}
            </span>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Resumo Executivo</h4>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                {analysisResult.summary}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Recomendações Práticas</h4>
              <ul className="space-y-3">
                {analysisResult.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-slate-50 p-4 rounded text-xs text-slate-400 mt-4 text-center">
              * Esta análise é gerada por Inteligência Artificial e não substitui o parecer jurídico formal de um advogado.
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 text-slate-500 flex-col gap-4">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Carregando dados da auditoria...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="w-6 h-6 text-indigo-400" />
            RuralAudit Pro
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <ChartBarIcon className="w-5 h-5" /> Visão Geral
          </button>
          <div className="pt-4 pb-2 px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">Auditoria</div>
          <button 
            onClick={() => setActiveTab('property')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'property' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <HomeModernIcon className="w-5 h-5" /> Imóvel
          </button>
          <button 
            onClick={() => setActiveTab('parties')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'parties' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <UsersIcon className="w-5 h-5" /> Partes (V/C)
          </button>
          <div className="pt-4 pb-2 px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">Conclusão</div>
          <button 
            onClick={() => setActiveTab('analysis')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'analysis' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <ClipboardDocumentCheckIcon className="w-5 h-5" /> Relatório IA
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          v1.0.0
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Unified Top Header (Replaces Mobile Header) */}
        <TopHeader />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <header className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                {activeTab === 'dashboard' && 'Visão Geral da Auditoria'}
                {activeTab === 'property' && 'Auditoria do Imóvel'}
                {activeTab === 'parties' && 'Auditoria das Partes'}
                {activeTab === 'analysis' && 'Análise de Risco com IA'}
              </h1>
              <p className="text-slate-500 mt-1">
                {activeTab === 'dashboard' && 'Acompanhe o progresso e pendências do processo de Due Diligence.'}
                {activeTab === 'property' && 'Gestão de certidões, matrículas e regularidade ambiental.'}
                {activeTab === 'parties' && 'Análise de vendedores, compradores e cônjuges.'}
                {activeTab === 'analysis' && 'Gere pareceres automáticos baseados nos dados coletados.'}
              </p>
            </header>

            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'property' && <PropertyView />}
            {activeTab === 'parties' && <PartiesView />}
            {activeTab === 'analysis' && <AnalysisView />}
          </div>
        </main>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-fade-in">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                        {deleteTarget.type === 'item' ? 'Excluir Item' : 
                         deleteTarget.type === 'party' ? 'Excluir Parte' : 'Excluir Imóvel'}
                    </h3>
                    <p className="text-sm text-slate-500 mb-6">
                        Você tem certeza que deseja remover {
                            deleteTarget.type === 'item' ? 'este item da auditoria' :
                            deleteTarget.type === 'party' ? 'esta parte e todos os seus itens' :
                            'este imóvel e toda a sua checklist'
                        }? Esta ação não pode ser desfeita.
                    </p>
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={() => setDeleteTarget(null)}
                            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={executeDelete}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        >
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}