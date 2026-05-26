import re
import os

def migrate_massive_constants():
    ext_path = 'src/extension.ts'
    const_path = 'src/constants.ts'
    
    with open(ext_path, 'r', encoding='utf-8') as f:
        content = f.read()

    extracted_data = []
    
    # List of constants to migrate
    target_consts = ['AGENTS', 'AGENT_TOOLS_CATALOG', 'DEFAULT_AGENT_GOALS', 'OPTIONAL_AGENTS_DEFAULT', 'LOCKED_AGENTS_DEFAULT']
    
    for name in target_consts:
        # Find const NAME = { ... } or const NAME = new Set([...])
        pattern = r'(?m)^export\s+const\s+' + name + r'\b\s*=\s*(.*?);(?=\n)'
        match = re.search(pattern, content, re.DOTALL)
        if not match:
            # Try without export
            pattern = r'(?m)^const\s+' + name + r'\b\s*=\s*(.*?);(?=\n)'
            match = re.search(pattern, content, re.DOTALL)
            
        if match:
            full_block = match.group(0)
            extracted_data.append(full_block)
            # Remove from extension.ts
            content = content.replace(full_block, f"// {name} moved to constants.ts")

    if not extracted_data:
        print("No constants found to migrate.")
        return

    # Update constants.ts
    with open(const_path, 'r', encoding='utf-8') as f:
        const_content = f.read()
    
    # Add exported versions of the extracted data
    new_entries = []
    for block in extracted_data:
        if not block.startswith('export '):
            new_entries.append('export ' + block)
        else:
            new_entries.append(block)
            
    final_const_content = const_content + "\n\n" + "\n\n".join(new_entries)
    
    with open(const_path, 'w', encoding='utf-8') as f:
        f.write(final_const_content)
        
    with open(ext_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Migrated {len(extracted_data)} massive constants to constants.ts.")

migrate_massive_constants()
