import re

def final_syntax_fix():
    path = 'src/extension.ts'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix the dangling '> {' or '> Promise<...>'
    # Match lines like '> {' or '> Promise<...>' or '> :'
    content = re.sub(r'(?m)^>\s*\{', '', content)
    content = re.sub(r'(?m)^>\s*:', '', content)
    content = re.sub(r'(?m)^>\s*Promise\s*<[^>]*>', '', content)
    
    # Fix broken function heads that might have been partially nuked
    # Search for blocks that start with { but have no function/class head
    # Actually, let's just look for the specific patterns observed in the viewed file
    content = content.replace('\n> {', '\n')
    
    # Fix implicit any again for safety
    content = content.replace('(t =>', '((t: any) =>')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

final_syntax_fix()
print("Syntax debris cleaned.")
