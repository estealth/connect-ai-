import re
import os

def final_clean_sweep():
    ext_path = 'src/extension.ts'
    with open(ext_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove all _seed... functions (even those we missed before)
    # We use a greedy match for the entire function block
    content = re.sub(r'(?m)^function\s+_seed\w+\s*\(.*?\)\s*\{.*?^\}', '// Seed moved to Scaffolder', content, flags=re.DOTALL|re.MULTILINE)

    # 2. Remove giant string constants
    # (Matches any const NAME = `...` block that is longer than 500 chars)
    def remove_giant_strings(match):
        name = match.group(1)
        body = match.group(0)
        if len(body) > 500:
            return f"// Const {name} moved to core/prompts.ts or ui/graph-template.ts"
        return body

    content = re.sub(r'(?m)^const\s+(\w+)\s*=\s*`.*?`(\s*;)?', remove_giant_strings, content, flags=re.DOTALL)

    # 3. Add necessary imports at the top
    imports = """
import { Scaffolder } from './core/scaffolder';
import * as Prompts from './core/prompts';
import { RENDER_GRAPH_HTML } from './ui/graph-template';
"""
    if "import { Scaffolder }" not in content:
        content = re.sub(r'^(import\s+.*?\n)', r'\1' + imports, content, count=1)

    # 4. Final redundant cleanup
    content = re.sub(r'\n{3,}', '\n\n', content)

    with open(ext_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Final clean sweep completed. extension.ts is now optimized.")

final_clean_sweep()
