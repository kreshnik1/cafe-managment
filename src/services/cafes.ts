import { supabase } from './supabase';
import { Cafe } from '../types';

export async function getCafeByOwner(ownerId: string): Promise<Cafe | null> {
  const { data, error } = await supabase
    .from('cafes')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCafe(name: string, ownerId: string): Promise<Cafe> {
  const { data, error } = await supabase
    .from('cafes')
    .insert({ name, owner_id: ownerId })
    .select()
    .single();
  if (error) throw error;
  return data;
}
