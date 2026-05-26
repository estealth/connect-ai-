import re
import os

def nuke_zombie_code():
    ext_path = 'src/extension.ts'
    if not os.path.exists(ext_path):
        return

    with open(ext_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    i = 0
    total_removed = 0
    
    # 1. First, identify and remove all blocks starting with _OBSOLETE_
    # or containing other deprecated markers.
    while i < len(lines):
        line = lines[i]
        
        # Check if this line starts a zombie declaration
        # Matches: export class _OBSOLETE_..., function _OBSOLETE_..., etc.
        is_zombie_start = '_OBSOLETE_' in line or 'class _OBSOLETE_' in line or '// moved ' in line or '// removed ' in line
        
        if is_zombie_start:
            # Skip this line and find the matching closing brace if it opens a block
            if '{' in line:
                brace_count = line.count('{') - line.count('}')
                i += 1
                while brace_count > 0 and i < len(lines):
                    brace_count += lines[i].count('{')
                    brace_count -= lines[i].count('}')
                    i += 1
                total_removed += 1
                continue
            else:
                # Single line zombie (like a variable or interface comment)
                total_removed += 1
                i += 1
                continue
        
        new_lines.append(line)
        i += 1

    content = "".join(new_lines)

    # 2. Final Refinement: Remove massive comment blocks that are no longer relevant
    # (Pulls from older refactoring steps that left breadcrumbs)
    content = re.sub(r'(?m)^// \[Moved to service\].*?\n', '', content)
    content = re.sub(r'(?m)^// MOVED .*?\n', '', content)
    content = re.sub(r'(?m)^// removed duplicate .*?\n', '', content)
    content = re.sub(r'(?m)^// Internal Aliases for moved services.*?\n', '', content)

    # 3. Clean up double/triple newlines left behind
    content = re.sub(r'\n{3,}', '\n\n', content)

    # 4. Ensure Service Wrappers are clean
    # Remove the "// Service Wrappers" header and re-add it clearly at the end
    if "// Service Wrappers" in content:
        parts = content.split("// Service Wrappers")
        main_body = parts[0].strip()
        wrappers_part = parts[1].strip()
        
        # Reconstruct file: Imports -> Main Extension -> Wrappers
        final_content = main_body + "\n\n" + "// ============================================================\n" + "// Service Wrappers (Legacy Compatibility Layer)\n" + "// ============================================================\n" + wrappers_part
    else:
        final_content = content

    with open(ext_path, 'w', encoding='utf-8') as f:
        f.write(final_content)
    
    print(f"Nuked {total_removed} zombie blocks. extension.ts is now slim.")

nuke_zombie_code()
