import fs from 'fs';
import path from 'path';

const filePath = 'c:\\Users\\SHIN\\work\\AI\\Connect ai lab\\my-connect-ai\\src\\ui\\sidebar-chat.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Methods to remove
const methodsToRemove = [
    '_callAgentLLM',
    '_consumeLLMStream',
    '_executeActions',
    '_stripActionTags',
    '_tryDataShortcut',
    '_tryKitShortcut',
    '_tryRevenueShortcut',
    '_buildRecentFilesContext',
    '_detectExplicitMention',
    '_trackFileAction',
    '_fuzzyPathHint',
    '_harvestActionItems'
];

for (const method of methodsToRemove) {
    const regex = new RegExp(`private (async )?${method}\\b[\\s\\S]*?^    }`, 'gm');
    content = content.replace(regex, `// Extracted ${method}`);
}

// Also remove the old tail of _handleCorporatePrompt
// It starts with "if (bridgeMode !== 'full' && _isCasualChat(prompt)) {" and ends before _getHtml
const startMarker = "if (bridgeMode !== 'full' && _isCasualChat(prompt)) {";
const endMarker = "// ============================================================";
const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    content = content.slice(0, startIdx) + "// Extracted _handleCorporatePrompt tail\n    " + content.slice(endIdx);
}

fs.writeFileSync(filePath, content);
console.log('Cleanup complete');
