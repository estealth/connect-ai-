import re

def final_cleanup():
    path = 'src/extension.ts'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove definitions of things that are now in UI files
    # TaskTreeItem, TaskTreeProvider
    to_remove = ['TaskTreeItem', 'TaskTreeProvider']
    for name in to_remove:
        # Match class definition
        pattern = r'(?m)^(export\s+)?class\s+' + re.escape(name) + r'\b'
        match = re.search(pattern, content)
        if match:
            # Find start and end of class (brace counting)
            start_idx = match.start()
            brace_start = content.find('{', match.end())
            if brace_start != -1:
                count = 1
                i = brace_start + 1
                while count > 0 and i < len(content):
                    if content[i] == '{': count += 1
                    elif content[i] == '}': count -= 1
                    i += 1
                if count == 0:
                    content = content[:start_idx] + "// MOVED " + name + content[i:]

    # 2. Fix the export duplications
    content = content.replace('export export ', 'export ')
    content = content.replace('export async export ', 'export async ')
    content = content.replace('async export function', 'export async function')
    
    # 3. Fix Promise return types (TS1064)
    # We can use a regex to find 'async function foo(...): type' and wrap type in Promise
    # But only if type doesn't already start with Promise
    def wrap_promise(m):
        prefix = m.group(1)
        name = m.group(2)
        params = m.group(3)
        ret_type = m.group(4)
        if 'Promise' in ret_type: return m.group(0)
        return f'{prefix}async function {name}{params}: Promise<{ret_type}>'

    content = re.sub(r'(?m)^(export\s+)?async\s+function\s+([A-Za-z0-9_]+)(\([^)]*\))\s*:\s*([^{]+)', wrap_promise, content)

    # 4. Fix implicit any
    content = content.replace('(t =>', '((t: any) =>')
    content = content.replace('(x =>', '((x: any) =>')
    
    # 5. Fix double export keyword again just in case
    content = re.sub(r'\bexport\s+export\b', 'export', content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

final_cleanup()
print("Final cleanup complete.")
