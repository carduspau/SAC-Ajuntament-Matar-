import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { parseSentiment } from '@/lib/sentiment';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const from = sp.get('from');
  const to = sp.get('to');
  const barri = sp.get('barri') || null;
  const canal = sp.get('canal') || null;
  const clas1 = sp.get('clas1') || null;
  const clas2 = sp.get('clas2') || null;
  const sentimentMin = sp.get('sentimentMin') ? parseFloat(sp.get('sentimentMin')!) : null;
  const sentimentMax = sp.get('sentimentMax') ? parseFloat(sp.get('sentimentMax')!) : null;
  const q = sp.get('q') || null;
  const page = parseInt(sp.get('page') || '0', 10);
  const pageSize = Math.min(parseInt(sp.get('pageSize') || '20', 10), 100);
  const sortBy = sp.get('sortBy') || 'data_inici';
  const sortDir = sp.get('sortDir') === 'asc' ? true : false;

  const supabase = createServerSupabase();
  let query = supabase
    .from('sac_messages')
    .select('*', { count: 'exact' });

  if (from) query = query.gte('data_inici', from);
  if (to) query = query.lte('data_inici', to);
  if (barri) query = query.eq('barri', barri);
  if (canal) query = query.eq('canal', canal);
  if (clas1) query = query.eq('clas1', clas1);
  if (clas2) query = query.eq('clas2', clas2);
  if (q) query = query.ilike('message', `%${q}%`);

  const allowedSorts = ['data_inici', 'barri', 'canal', 'clas1', 'sentiment', 'id'];
  const safeSort = allowedSorts.includes(sortBy) ? sortBy : 'data_inici';
  query = query.order(safeSort, { ascending: sortDir });
  query = query.range(page * pageSize, (page + 1) * pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Apply sentiment filter in JS (text field)
  let filtered = data ?? [];
  if (sentimentMin !== null || sentimentMax !== null) {
    filtered = filtered.filter(row => {
      const s = parseSentiment(row.sentiment);
      if (s === null) return false;
      if (sentimentMin !== null && s < sentimentMin) return false;
      if (sentimentMax !== null && s > sentimentMax) return false;
      return true;
    });
  }

  return NextResponse.json({ data: filtered, count: count ?? 0 });
}
