import { supabase } from '../supabaseClient';
import { AuditState, PropertyData, Party, AuditItem } from '../types';
import { PROPERTY_CHECKLIST_TEMPLATE } from '../data/defaults';

// --- Fetch Full State ---
export const fetchAuditState = async (): Promise<AuditState> => {
  const { data: properties, error: propError } = await supabase.from('properties').select('*').order('created_at');
  const { data: parties, error: partyError } = await supabase.from('parties').select('*').order('created_at');
  const { data: items, error: itemsError } = await supabase.from('audit_items').select('*');
  const { data: settings, error: settingsError } = await supabase.from('audit_settings').select('*').single();

  // If any major fetch fails (likely due to missing credentials or setup), 
  // return empty state so app can load in "offline/local" mode.
  if (propError || partyError || itemsError) {
    console.warn("Supabase fetch failed (likely misconfigured or empty), defaulting to local state.", propError, partyError, itemsError);
    return {
      properties: [],
      parties: [],
      generalNotes: ''
    };
  }

  // Map flat items to nested structure
  const mappedProperties: PropertyData[] = (properties || []).map((p: any) => ({
    ...p,
    items: items?.filter((i: any) => i.parent_id === p.id && i.parent_type === 'property') || []
  }));

  const mappedParties: Party[] = (parties || []).map((p: any) => ({
    ...p,
    items: items?.filter((i: any) => i.parent_id === p.id && i.parent_type === 'party') || []
  }));

  return {
    properties: mappedProperties,
    parties: mappedParties,
    generalNotes: settings?.general_notes || ''
  };
};

// --- Properties ---
export const createProperty = async (property: PropertyData) => {
  // 1. Create Property
  const { items, ...propData } = property;
  const { data, error } = await supabase.from('properties').insert(propData).select().single();
  if (error) throw error;

  // 2. Create Default Items for Property
  const itemsToInsert = items.map(item => ({
    ...item,
    id: undefined, // Let DB generate UUID
    parent_id: data.id,
    parent_type: 'property'
  }));

  // Need to return the property with the NEW IDs for the items
  const { data: insertedItems, error: itemsError } = await supabase.from('audit_items').insert(itemsToInsert).select();
  if (itemsError) throw itemsError;

  return { ...data, items: insertedItems };
};

export const updateProperty = async (id: string, updates: Partial<PropertyData>) => {
  const { error } = await supabase.from('properties').update(updates).eq('id', id);
  if (error) console.error(error);
};

export const deleteProperty = async (id: string) => {
  // Cascade delete items usually handled by DB, but safe to do manually or rely on FK constraints if set
  await supabase.from('audit_items').delete().eq('parent_id', id);
  await supabase.from('properties').delete().eq('id', id);
};

// --- Parties ---
export const createParty = async (party: Party) => {
  const { items, ...partyData } = party;
  const { data, error } = await supabase.from('parties').insert(partyData).select().single();
  if (error) throw error;

  const itemsToInsert = items.map(item => ({
    ...item,
    id: undefined,
    parent_id: data.id,
    parent_type: 'party'
  }));

  const { data: insertedItems, error: itemsError } = await supabase.from('audit_items').insert(itemsToInsert).select();
  if (itemsError) throw itemsError;

  return { ...data, items: insertedItems };
};

export const updateParty = async (id: string, updates: Partial<Party>) => {
  const { error } = await supabase.from('parties').update(updates).eq('id', id);
  if (error) console.error(error);
};

export const deleteParty = async (id: string) => {
  await supabase.from('audit_items').delete().eq('parent_id', id);
  await supabase.from('parties').delete().eq('id', id);
};

// --- Items ---
export const createAuditItem = async (item: AuditItem, parentId: string, parentType: 'property' | 'party') => {
  const itemPayload = {
    ...item,
    id: undefined, // Let DB generate UUID if it was a temp ID
    parent_id: parentId,
    parent_type: parentType
  };
  const { data, error } = await supabase.from('audit_items').insert(itemPayload).select().single();
  if (error) throw error;
  return data;
};

export const updateAuditItem = async (id: string, updates: Partial<AuditItem>) => {
  const { error } = await supabase.from('audit_items').update(updates).eq('id', id);
  if (error) console.error(error);
};

export const deleteAuditItem = async (id: string) => {
  const { error } = await supabase.from('audit_items').delete().eq('id', id);
  if (error) console.error(error);
};

// --- Settings ---
export const updateGeneralNotes = async (notes: string) => {
  const { error } = await supabase.from('audit_settings').update({ general_notes: notes }).eq('id', 1);
  if (error) console.error(error);
};