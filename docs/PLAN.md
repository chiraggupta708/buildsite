# UX Redesign Implementation Plan

## Overview
Reduce click depth in BuildSite. 4 workstreams:
1. Collapsible sidebar with hamburger toggle + proper active state
2. Clients page with inline site expansion (no extra click into client detail)
3. Site detail page with collapsible sections showing phases/labour/materials inline
4. Main Dashboard as executive overview (total ₹, overdue, alerts)

## Task Breakdown

### Sub-agent A: Sidebar (sidebar.tsx + layout.tsx)
- [ ] Make sidebar collapsible: hamburger icon (☰) top-left toggles sidebar open/closed
- [ ] 3 collapsible sections: Dashboard (always visible when sidebar open), Clients & Sites, Labour
- [ ] Fix active state: when on any site detail page, the Clients section should be highlighted, NOT Dashboard. Dashboard only highlights when on `/dashboard`
- [ ] Responsive: on mobile, sidebar overlays from left with backdrop
- [ ] State: open/closed persisted in localStorage

### Sub-agent B: Clients Page (clients/page.tsx)
- [ ] Clients show as cards with name, email, phone, site count
- [ ] Clicking a client card expands to show their sites inline (no navigation)
- [ ] Each inline site row shows: name, status badge, start date, actions (View, Add Phase)
- [ ] Client expansion state managed via "use client" with URL state or local state

### Sub-agent C: Site Detail Page (sites/[id]/page.tsx)
- [ ] 3 collapsible sections: Phases & Estimates, Labour, Materials
- [ ] Phases & Estimates: inline table showing phase name, estimate ₹, paid ₹, payment status %, View button
- [ ] Labour: card grid with quick edit/payment action buttons
- [ ] Materials: table with low-stock highlights, inline Log Usage / Add Purchase buttons
- [ ] Remove empty "Go to Phases" placeholder card — show actual data inline
- [ ] Sections remember collapse state (localStorage or URL param)

### Sub-agent D: Main Dashboard (dashboard/page.tsx)
- [ ] Replace 3 count cards with executive overview
- [ ] Total Investment (labour + material) across all sites
- [ ] Total Client Payments received
- [ ] Sites with overdue phase payments (where paid < estimated)
- [ ] Low stock alerts across all sites (limit 5)
- [ ] Recent activity: last 5 created/updated sites
- [ ] Quick links: "Clients with pending payments", "Low stock materials"