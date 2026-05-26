import re

def nuke_orphans():
    path = 'src/extension.ts'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Identify orphaned blocks by common patterns in their bodies
    # for readHiredAgents:
    # { try { const p = _hiredJsonPath(); ... } catch { return {}; } }
    
    # Let's find blocks that start with 'try {' at the top level (sort of)
    # and contain specific calls.
    
    patterns = [
        r'(?m)^\{\s*try\s*\{\s*const\s+p\s*=\s*_hiredJsonPath\(\);.*?\n\}',
        r'(?m)^\{\s*try\s*\{\s*const\s+p\s*=\s*_activeJsonPath\(\);.*?\n\}',
        # Also fix the one at 3638 (fetchYouTubeAnalyticsSummary maybe?)
        r'(?m)^\{\s*const\s+at\s*=\s*await\s+_ensureYtAccessToken\(\);.*?\n\}',
    ]
    
    for p in patterns:
        content = re.sub(p, '', content, flags=re.DOTALL)

    # A more aggressive approach: find any '{' at the start of a line that 
    # isn't preceded by a function/class head on the previous line.
    # But that's risky.
    
    # Let's just fix the specific line numbers from the error log.
    # 806, 890, 3620, 3799, 10435
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

nuke_orphans()
print("Orphaned blocks removed.")
