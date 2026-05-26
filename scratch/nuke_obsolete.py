import re

def nuke_obsolete():
    path = 'src/extension.ts'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # First, fix the 'Noneasync' mess
    content = content.replace('Noneasync', 'async')

    # Find all functions/vars starting with _DEPRECATED_ or _OBSOLETE_
    # and remove them.
    while True:
        match = re.search(r'(?m)^(export\s+)?(async\s+)?(function|const|let|class)\s+(_DEPRECATED_|_OBSOLETE_)[A-Za-z0-9_]*', content)
        if not match: break
        
        start_idx = match.start()
        # Find the end of the block
        if 'const' in match.group(0) or 'let' in match.group(0):
            end_idx = content.find(';', start_idx)
            if end_idx == -1: end_idx = content.find('\n', start_idx)
            if end_idx != -1:
                content = content[:start_idx] + content[end_idx+1:]
            else:
                content = content[:start_idx] # safety
        else:
            brace_start = content.find('{', match.end())
            if brace_start == -1: 
                # maybe just a declaration without body?
                end_idx = content.find('\n', start_idx)
                content = content[:start_idx] + content[end_idx+1:]
                continue
            
            count = 1
            i = brace_start + 1
            while count > 0 and i < len(content):
                if content[i] == '{': count += 1
                elif content[i] == '}': count -= 1
                i += 1
            if count == 0:
                content = content[:start_idx] + content[i:]
            else:
                content = content[:start_idx] # safety

    # Also fix some specific broken Promise lines from my previous regex
    content = re.sub(r'Promise<\s*>\s*\{', 'Promise<{', content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

nuke_obsolete()
print("Nuked all obsolete members.")
