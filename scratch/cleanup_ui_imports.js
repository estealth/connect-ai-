const fs = require('fs');

const pathItems = [
    '_getBrainDir', '_isBrainDirExplicitlySet', 'getCompanyDir'
];

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Remove the path items from the extension import block
    pathItems.forEach(it => {
        // Regex to match the item with possible comma and spaces/newlines around it
        const re = new RegExp(`^\\s*${it},?\\s*\\n`, 'm');
        content = content.replace(re, '');
        // Also catch if it's on the same line as others (less likely with my current formatting but for safety)
        const re2 = new RegExp(`,?\\s*${it}\\s*(?=[,}])`, 'g');
        content = content.replace(re2, '');
    });

    // Ensure they are imported from paths.ts
    if (!content.includes('../paths')) {
        content = content.replace(/import \* as vscode/, `import { ${pathItems.join(', ')} } from '../paths';\nimport * as vscode`);
    }

    fs.writeFileSync(filePath, content, 'utf-8');
}

fixFile('src/ui/sidebar-chat.ts');
fixFile('src/ui/office-panel.ts');
fixFile('src/ui/dashboard-providers.ts');

console.log('Cleaned up UI imports.');
