"""Regenerate VERIFICATION.md and the library table in docs/DETAILS.md from the guide JSON files."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
gs = [json.load(open(f)) for f in sorted((ROOT / 'backend/guides/library').glob('*.json'))]
name = lambda g: g['app'].split(' (')[0]
lab = {'checked': 'Checked against docs', 'not_checked': 'Not re-checked'}
dif = {'easy': '🟢 Easy', 'medium': '🟡 Medium', 'hard': '🟠 Hard', 'very_hard': '🔴 Very Hard'}

# ── VERIFICATION.md: keep the hand-written header/headline sections, rebuild summary + detail ──
v = (ROOT / 'VERIFICATION.md').read_text()
head = v[:v.index('## Summary')]
tail_start = v.index('## Not covered')
tail = v[tail_start:]
mid = ['## Summary', '', '| Guide | Status | Confirmed | Corrected | Unverified |', '|---|---|---|---|---|']
for g in gs:
    x = g['verification']
    mid.append(f"| {name(g)} | {lab.get(x['status'], x['status'])} | {len(x['confirmed'])} | {len(x['corrected'])} | {len(x['unverified'])} |")
hl_start = v.index('## Headline corrections'); hl_end = v.index('## Per-guide detail')
headline = v[hl_start:hl_end]
detail = ['## Per-guide detail', '']
for g in gs:
    x = g['verification']
    detail += [f"### {name(g)}", f"- **Status:** {lab.get(x['status'], x['status'])} · **Confidence:** `{g['confidence']}` · **Managed auth flag:** `{g['composio_managed_auth']}`"]
    if x['checked_against']:
        detail.append('- **Checked against:** ' + ', '.join(f'<{u}>' for u in x['checked_against']))
    for title, key, ic in (('Confirmed', 'confirmed', '✅'), ('Corrected', 'corrected', '🛠'), ('Could not verify', 'unverified', '❓')):
        if x[key]:
            detail.append(f'- **{title}:**')
            detail += [f'  - {ic} {t}' for t in x[key]]
    detail.append('')
live = (ROOT / 'VERIFICATION.md').read_text()
(ROOT / 'VERIFICATION.md').write_text(head + '\n'.join(mid) + '\n\n' + headline + '\n'.join(detail) + '\n' + tail)

# ── library table in docs/DETAILS.md ──
d = (ROOT / 'docs/DETAILS.md').read_text()
a = d.index('| App | Difficulty | Setup time |'); b = d.index('Each guide contains')
rows = ['| App | Difficulty | Setup time | Approval | Review required | Composio managed auth | Confidence | Checked against docs |', '|---|---|---|---|---|---|---|---|']
for g in sorted(gs, key=lambda g: ['easy', 'medium', 'hard', 'very_hard'].index(g['difficulty'])):
    rows.append(f"| {name(g)} | {dif[g['difficulty']]} | {g['setup_time_estimate']} | {g['approval_time_estimate'].split(' (')[0]} | {'Yes' if g['requires_approval'] else 'No'} | {'Yes' if g['composio_managed_auth'] else 'No'} | {g['confidence'].replace('_', ' ').title()} | {'Yes' if g['verification']['status'] == 'checked' else 'No'} |")
(ROOT / 'docs/DETAILS.md').write_text(d[:a] + '\n'.join(rows) + '\n\n' + d[b:])
print(len(gs), 'guides')
