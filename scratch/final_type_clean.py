import re
import os

def final_type_clean():
    ext_path = 'src/extension.ts'
    with open(ext_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Define targets to remove COMPLETELY from extension.ts
    # (Because they are now in services/types.ts or agents.ts)
    targets = [
        r'export\s+interface\s+TrackerTask\b',
        r'export\s+type\s+TaskPriority\b',
        r'export\s+interface\s+AgentDef\b'
    ]
    
    for target in targets:
        match = re.search(target, content)
        while match:
            start_idx = match.start()
            # Find the end of the block
            brace_count = 0
            idx = start_idx
            found_start = False
            while idx < len(content):
                if content[idx] == '{':
                    brace_count += 1
                    found_start = True
                elif content[idx] == '}':
                    brace_count -= 1
                elif content[idx] == ';' and not found_start:
                    # Single line type definition
                    idx += 1
                    break
                
                idx += 1
                if found_start and brace_count == 0:
                    break
            
            print(f"Removing local definition of {target}")
            content = content[:start_idx] + f"// Nuked local {target}\n" + content[idx:]
            match = re.search(target, content)

    # Also remove duplicate function implementations of readTracker/writeTracker
    # if they are still there as "function readTracker" (vs "const readTracker")
    content = re.sub(r'(?m)^export\s+function\s+(readTracker|writeTracker|addTrackerTask|updateTrackerTask)\b.*?^\}', '// duplicate removed', content, flags=re.DOTALL|re.MULTILINE)

    # Add the single source of truth import at the very top
    if "import { TrackerTask, TaskPriority } from './services/types';" not in content:
        content = "import { TrackerTask, TaskPriority } from './services/types';\n" + content

    with open(ext_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Final type clean complete.")

final_type_clean()
