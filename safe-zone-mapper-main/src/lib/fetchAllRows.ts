import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches ALL rows from a table, bypassing the 1000-row default limit.
 */
export async function fetchAllAccidents(select: string = '*') {
  const PAGE = 1000;
  let all: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('accidents')
      .select(select)
      .order('date', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}
