import re
import os

def final_surgical_fix_v2():
    ext_path = 'src/extension.ts'
    with open(ext_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. REMOVE local TrackerTask and TaskPriority definitions
    # Look for the start and end of these interfaces/types
    content = re.sub(r'(?m)^export\s+interface\s+TrackerTask\b.*?^\}', '', content, flags=re.DOTALL|re.MULTILINE)
    content = re.sub(r'(?m)^export\s+type\s+TaskPriority\b.*?;', '', content)
    
    # 2. Fix the duplicate readTracker/writeTracker
    # They were probably duplicated at the top and bottom or middle
    # I'll keep the ones at the top (exported aliases) and remove all others
    
    # Remove any "export function readTracker" or "function readTracker" definitions
    # (The aliases are "export const readTracker = ...")
    content = re.sub(r'(?m)^export\s+function\s+readTracker\b.*?^\}', '', content, flags=re.DOTALL|re.MULTILINE)
    content = re.sub(r'(?m)^export\s+function\s+writeTracker\b.*?^\}', '', content, flags=re.DOTALL|re.MULTILINE)
    content = re.sub(r'(?m)^function\s+readTracker\b.*?^\}', '', content, flags=re.DOTALL|re.MULTILINE)
    content = re.sub(r'(?m)^function\s+writeTracker\b.*?^\}', '', content, flags=re.DOTALL|re.MULTILINE)

    # 3. Fix the "Duplicate function implementation" for deactivate
    # Ensure there is only ONE deactivate function
    matches = list(re.finditer(r'(?m)^export\s+function\s+deactivate\b', content))
    if len(matches) > 1:
        # Keep the last one
        for m in matches[:-1]:
            # Find the end of this block
            brace_count = 0
            started = False
            idx = m.end()
            while idx < len(content):
                if content[idx] == '{':
                    brace_count += 1
                    started = True
                elif content[idx] == '}':
                    brace_count -= 1
                idx += 1
                if started and brace_count == 0:
                    break
            content = content[:m.start()] + "// removed duplicate deactivate\n" + content[idx:]

    with open(ext_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Surgical fix v2 completed.")

final_surgical_fix_v2()
