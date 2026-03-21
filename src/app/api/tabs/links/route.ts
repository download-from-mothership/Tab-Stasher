import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/tabs/links — Get all links for a user's knowledge graph
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get('tabId');
    const linkType = searchParams.get('type');

    let query = supabase
      .from('tab_links')
      .select(`
        id,
        source_tab_id,
        target_tab_id,
        link_type,
        strength,
        created_at,
        source:tabs!tab_links_source_tab_id_fkey(id, title, url, primary_category, favicon),
        target:tabs!tab_links_target_tab_id_fkey(id, title, url, primary_category, favicon)
      `)
      .eq('user_id', user.id)
      .order('strength', { ascending: false });

    if (tabId) {
      query = query.or(`source_tab_id.eq.${tabId},target_tab_id.eq.${tabId}`);
    }

    if (linkType) {
      query = query.eq('link_type', linkType);
    }

    const { data: links, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ links: links || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/tabs/links — Create a link between two tabs
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sourceTabId, targetTabId, linkType = 'related', strength = 0.5 } = body;

    if (!sourceTabId || !targetTabId) {
      return NextResponse.json({ error: 'sourceTabId and targetTabId required' }, { status: 400 });
    }

    if (sourceTabId === targetTabId) {
      return NextResponse.json({ error: 'Cannot link a tab to itself' }, { status: 400 });
    }

    // Verify both tabs belong to the user
    const { data: tabs } = await supabase
      .from('tabs')
      .select('id')
      .eq('user_id', user.id)
      .in('id', [sourceTabId, targetTabId]);

    if (!tabs || tabs.length !== 2) {
      return NextResponse.json({ error: 'One or both tabs not found' }, { status: 404 });
    }

    const { data: link, error } = await supabase
      .from('tab_links')
      .upsert({
        user_id: user.id,
        source_tab_id: sourceTabId,
        target_tab_id: targetTabId,
        link_type: linkType,
        strength: Math.max(0, Math.min(1, strength))
      }, {
        onConflict: 'user_id,source_tab_id,target_tab_id'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ link });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/tabs/links — Remove a link
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('id');

    if (!linkId) {
      return NextResponse.json({ error: 'Link id required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('tab_links')
      .delete()
      .eq('id', linkId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
