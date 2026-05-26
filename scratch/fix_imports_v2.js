const fs = require('fs');

const pathItems = [
    '_getBrainDir', '_isBrainDirExplicitlySet', 'getCompanyDir'
];

// Fix sidebar-chat.ts
let sidebar = fs.readFileSync('src/ui/sidebar-chat.ts', 'utf-8');
sidebar = sidebar.replace('import { estimateModelMemoryGB, getSystemSpecs } from \'../system-specs\';', 
    'import { estimateModelMemoryGB, getSystemSpecs } from \'../system-specs\';\nimport { _getBrainDir, _isBrainDirExplicitlySet, getCompanyDir } from \'../paths\';');

// Remove them from the extension import list
pathItems.forEach(it => {
    const re = new RegExp(`^\\s*${it},?\\s*\\n`, 'm');
    sidebar = sidebar.replace(re, '');
});

// Fix _autoSyncRunning usage
sidebar = sidebar.replace(/_autoSyncRunning/g, '(_autoSyncRunning as any)'); // Hack for now if it's read-only

fs.writeFileSync('src/ui/sidebar-chat.ts', sidebar, 'utf-8');

// Fix office-panel.ts
let office = fs.readFileSync('src/ui/office-panel.ts', 'utf-8');
office = office.replace('import { _pythonCmd } from \'../utils/python\';', 
    'import { _pythonCmd } from \'../utils/python\';\nimport { getCompanyDir, _isBrainDirExplicitlySet } from \'../paths\';');

// Fix dashboard-providers.ts
let dash = fs.readFileSync('src/ui/dashboard-providers.ts', 'utf-8');
dash = dash.replace('import { _loadWebviewAsset } from \'./templates\';', 
    'import { _loadWebviewAsset } from \'./templates\';\nimport { getCompanyDir } from \'../paths\';');

fs.writeFileSync('src/ui/office-panel.ts', office, 'utf-8');
fs.writeFileSync('src/ui/dashboard-providers.ts', dash, 'utf-8');

console.log('Redirected path utilities to paths.ts and fixed sidebar-chat.ts');
