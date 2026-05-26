import re
import os

def final_surgical_fix():
    file_path = 'src/extension.ts'
    if not os.path.exists(file_path):
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # We want to identify top-level blocks that should be removed
    # Keywords that indicate a block is a leftover from a moved function
    zombie_keywords = [
        '_hiredJsonPath', '_activeJsonPath', 'YOUTUBE_API_KEY', 'YOUTUBE_CHANNEL_ID',
        'YouTube OAuth 연결 완료', 'readTracker', 'writeTracker', 'metrics.json',
        'company_state.json', '_getBrainDir()', 'AGENTS[ap.agentId]'
    ]

    new_lines = []
    i = 0
    wrappers_hit = False
    
    while i < len(lines):
        line = lines[i]
        
        if '// Service Wrappers' in line:
            wrappers_hit = True

        # If we hit a block and we're NOT in the wrappers section yet
        if not wrappers_hit and ('function' in line or 'class' in line or '{' in line or 'async' in line):
            # Check if this line OR the next few lines contain a zombie keyword
            lookahead = "".join(lines[i:i+5])
            is_zombie = any(kw in lookahead for kw in zombie_keywords)
            
            # Special case for broken fragments starting with " = {}" or " catch {"
            if re.match(r'^\s*(=|catch|else|\})', line) and not line.strip() == '}':
                is_zombie = True

            if is_zombie:
                # Find the end of this block
                brace_count = 0
                started = False
                while i < len(lines):
                    l = lines[i]
                    if '{' in l:
                        brace_count += l.count('{')
                        started = True
                    if '}' in l:
                        brace_count -= l.count('}')
                    
                    i += 1
                    if started and brace_count <= 0:
                        break
                continue # Skip this zombie block

        new_lines.append(line)
        i += 1

    content = "".join(new_lines)

    # 2. Fix the keyword order and duplicates
    content = content.replace('export export ', 'export ')
    content = content.replace('export async export ', 'export async ')
    content = re.sub(r'async\s+export\s+function', 'export async function', content)
    content = content.replace('Noneasync', 'async')

    # 3. Nuke anything starting with _DEPRECATED_ or _OBSOLETE_
    while True:
        match = re.search(r'(?m)^(export\s+)?(async\s+)?(function|const|let|class)\s+(_DEPRECATED_|_OBSOLETE_)[A-Za-z0-9_]*', content)
        if not match: break
        
        start_idx = match.start()
        brace_start = content.find('{', match.end())
        if brace_start == -1:
            end_idx = content.find('\n', start_idx)
            content = content[:start_idx] + content[end_idx+1:]
        else:
            brace_count = 1
            idx = brace_start + 1
            while brace_count > 0 and idx < len(content):
                if content[idx] == '{': brace_count += 1
                elif content[idx] == '}': brace_count -= 1
                idx += 1
            content = content[:start_idx] + content[idx:]

    # 4. Fix implicit any
    content = re.sub(r'\.filter\((\w+)\s*=>', r'.filter((\1: any) =>', content)
    content = re.sub(r'\.map\((\w+)\s*=>', r'.map((\1: any) =>', content)
    
    # 5. Fix TaskTree redeclaration
    # If they are already defined in extension.ts but also imported, remove definitions
    if "import { TaskTreeProvider, TaskTreeItem } from './ui/task-tree';" in content:
        content = re.sub(r'(?m)^export\s+class\s+TaskTreeItem\b.*?^\}', '// MOVED TaskTreeItem', content, flags=re.DOTALL|re.MULTILINE)
        content = re.sub(r'(?m)^export\s+class\s+TaskTreeProvider\b.*?^\}', '// MOVED TaskTreeProvider', content, flags=re.DOTALL|re.MULTILINE)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Final surgical fix applied.")

final_surgical_fix()
