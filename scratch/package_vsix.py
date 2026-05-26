import json
import subprocess
import os

def package_now():
    pkg_path = 'package.json'
    with open(pkg_path, 'r', encoding='utf-8') as f:
        pkg = json.load(f)

    # Backup and clear prepublish
    old_prepublish = pkg.get('scripts', {}).get('vscode:prepublish', '')
    if 'scripts' in pkg:
        pkg['scripts']['vscode:prepublish'] = ''

    with open(pkg_path, 'w', encoding='utf-8') as f:
        json.dump(pkg, f, indent=2)

    try:
        print("Packaging vsix...")
        # Use full path for vsce or npx
        result = subprocess.run(['npx.cmd', 'vsce', 'package', '--allow-missing-repository', '--no-git-tag-version'], 
                                capture_output=True, text=True, shell=True)
        print(result.stdout)
        print(result.stderr)
    finally:
        # Restore prepublish
        pkg['scripts']['vscode:prepublish'] = old_prepublish
        with open(pkg_path, 'w', encoding='utf-8') as f:
            json.dump(pkg, f, indent=2)

    print("Packaging process finished.")

package_now()
