import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from 'react';
import { Link } from 'wouter';
import { ChevronDown, LockKeyhole, LogOut, Search, X } from 'lucide-react';

type IconType = ComponentType<{ size?: number | string; strokeWidth?: number | string; className?: string }>;
export interface SidebarLink { href: string; label: string; icon: IconType; hue: number; locked: boolean; active: boolean; slug: string; badge?: number }
export interface SidebarGroup { label: string; items: SidebarLink[] }

const STORE_KEY = 'sb-collapsed-groups';
const readClosed = (): Record<string, boolean> => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch { return {}; }
};
const writeClosed = (v: Record<string, boolean>) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } };

// Sidebar navigation: collapsible groups (remembered per browser), a quick
// "find a page" filter for long menus, tinted icon tiles, and badges that stay
// visible on a collapsed group so pending work is never hidden.
export function SidebarNav({ groups, onNavigate }: { groups: SidebarGroup[]; onNavigate: () => void }) {
  const [closed, setClosed] = useState<Record<string, boolean>>(readClosed);
  const [query, setQuery] = useState('');
  const total = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups]);
  const needle = query.trim().toLowerCase();

  // The group holding the current page is always expanded.
  const activeGroup = groups.find((g) => g.items.some((i) => i.active))?.label;
  useEffect(() => {
    if (activeGroup && closed[activeGroup]) setClosed((c) => { const n = { ...c, [activeGroup]: false }; writeClosed(n); return n; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup]);

  const toggle = (label: string) => setClosed((c) => { const n = { ...c, [label]: !c[label] }; writeClosed(n); return n; });

  const visible = groups
    .map((g) => ({ ...g, items: needle ? g.items.filter((i) => i.label.toLowerCase().includes(needle)) : g.items }))
    .filter((g) => g.items.length);

  return <nav className="sb-nav" aria-label="Panel navigation">
    {total > 9 && <label className="sb-find">
      <Search size={14} aria-hidden="true" />
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a page…" aria-label="Find a page" data-testid="input-sidebar-find" />
      {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={13} /></button>}
    </label>}

    {visible.map((group) => {
      const open = !!needle || !closed[group.label];
      const pending = group.items.reduce((n, i) => n + (i.badge || 0), 0);
      return <section key={group.label} className="sb-group" data-open={open}>
        <button type="button" className="sb-group__head" onClick={() => toggle(group.label)} aria-expanded={open} disabled={!!needle}>
          <span>{group.label}</span>
          {!open && pending > 0 && <em className="sb-group__pending">{pending > 9 ? '9+' : pending}</em>}
          <ChevronDown size={13} className="sb-group__chev" aria-hidden="true" />
        </button>
        <div className="sb-group__body"><div className="sb-group__inner">
          {group.items.map(({ href, label, icon: Icon, hue, locked, active, slug, badge }) =>
            <Link key={href} href={locked ? '/payments' : href} onClick={onNavigate} className="sb-item" style={{ '--h': hue } as CSSProperties}
              aria-current={active ? 'page' : undefined} tabIndex={open ? 0 : -1}
              title={locked ? `${label} — see Membership` : undefined} data-testid={`link-nav-${slug}`}>
              <span className="sb-item__tile"><Icon size={15} strokeWidth={2} /></span>
              <span className="sb-item__label">{label}</span>
              {locked && <LockKeyhole size={12} className="sb-item__lock" />}
              {!!badge && <span className="sb-item__badge">{badge > 9 ? '9+' : badge}</span>}
            </Link>)}
        </div></div>
      </section>;
    })}
    {!visible.length && <p className="sb-empty">No pages match “{query}”.</p>}
  </nav>;
}

export function SidebarProfile({ initials, name, subtitle, onSignOut, signingOut }: { initials: string; name: string; subtitle: string; onSignOut: () => void; signingOut: boolean }) {
  return <div className="sb-profile">
    <span className="sb-profile__avatar" aria-hidden="true">{initials}</span>
    <span className="sb-profile__text"><strong>{name}</strong><small>{subtitle}</small></span>
    <button type="button" disabled={signingOut} onClick={onSignOut} aria-label="Sign out" title="Sign out" data-testid="button-signout"><LogOut size={15} /></button>
  </div>;
}
