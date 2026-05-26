import json
import subprocess
import os
import sys

# Ensure UTF-8 output for console
sys.stdout.reconfigure(encoding='utf-8')

def rename_and_package():
    pkg_path = 'package.json'
    with open(pkg_path, 'r', encoding='utf-8') as f:
        pkg = json.load(f)

    # 1. Update Name
    pkg['displayName'] = "SHIN Connect AI"
    print("Renaming extension to SHIN Connect AI")

    # 2. Backup and clear prepublish
    old_prepublish = pkg.get('scripts', {}).get('vscode:prepublish', '')
    if 'scripts' in pkg:
        pkg['scripts']['vscode:prepublish'] = ''

    with open(pkg_path, 'w', encoding='utf-8') as f:
        json.dump(pkg, f, indent=2)

    try:
        print("Packaging new vsix...")
        result = subprocess.run(['npx.cmd', 'vsce', 'package', '--allow-missing-repository', '--no-git-tag-version'], 
                                capture_output=True, text=True, shell=True, encoding='utf-8')
        print(result.stdout)
        print(result.stderr)
    finally:
        # Restore prepublish
        pkg['scripts']['vscode:prepublish'] = old_prepublish
        with open(pkg_path, 'w', encoding='utf-8') as f:
            json.dump(pkg, f, indent=2)

    print("Process finished.")

rename_and_package()
