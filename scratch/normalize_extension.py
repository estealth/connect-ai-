import re

def normalize_extension():
    path = 'src/extension.ts'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix export duplications and order
    content = content.replace('export export ', 'export ')
    content = content.replace('export async export ', 'export async ')
    content = content.replace('async export function', 'export async function')
    
    # Fix the _DEPRECATED_ or _OBSOLETE_ functions that lost their async keyword
    # We look for functions that use 'await' but aren't 'async'
    # Actually, it's easier to just ensure that any function we renamed to _OBSOLETE_ or _DEPRECATED_
    # that was originally async gets its async back.
    # But even better: just remove them.
    
    # Let's find all _OBSOLETE_ or _DEPRECATED_ blocks and remove them.
    # I'll use a simpler approach: remove lines starting with // REMOVED or // DEPRECATED
    # or function _OBSOLETE_...
    # But wait, some might be multiline.
    
    # For now, let's just fix the 'async' order and duplicate 'export'
    # and the specific 'any' types mentioned in the error.
    
    content = content.replace('.filter(t =>', '.filter((t: any) =>')
    content = content.replace('.sort((a, b) =>', '.sort((a: any, b: any) =>')
    content = content.replace('.map(t =>', '.map((t: any) =>')
    content = content.replace('.filter(x =>', '.filter((x: any) =>')
    content = content.replace('.map(x =>', '.map((x: any) =>')
    
    # Fix specific await errors in _OBSOLETE_ functions
    # If a line contains 'await' and is inside a 'function _OBSOLETE_', it needs 'async'
    content = re.sub(r'(?m)^function\s+(_OBSOLETE_|_DEPRECATED_)', r'async function \1', content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

normalize_extension()
print("Extension normalization complete.")
