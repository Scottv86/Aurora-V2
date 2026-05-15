const fs = require('fs');

let code = fs.readFileSync('c:/Projects/aurora/src/components/ModuleEditor.tsx', 'utf8');
const lines = code.split(/\r?\n/);

const extracted = JSON.parse(fs.readFileSync('c:/Projects/aurora/scratch/extracted.json', 'utf8'));
const complexExperienceBlock = extracted.experience;

// Find views block start and end
const viewsStartIdx = lines.findIndex(l => l.includes(") : activeTab === 'views' ? ("));
let viewsEndIdx = -1;
if (viewsStartIdx !== -1) {
    for (let i = viewsStartIdx + 1; i < lines.length; i++) {
        if (lines[i].includes(") : activeTab ===")) {
            viewsEndIdx = i;
            break;
        }
    }
}

// Find experience subtab block start and end
const expStartIdx = lines.findIndex(l => l.includes("{detailsTab === 'experience' && ("));
let expEndIdx = -1;
if (expStartIdx !== -1) {
    for (let i = expStartIdx + 1; i < lines.length; i++) {
        if (lines[i].includes("{detailsTab === 'localization' && (")) {
            expEndIdx = i;
            break;
        }
    }
}

if (viewsStartIdx !== -1 && viewsEndIdx !== -1 && expStartIdx !== -1 && expEndIdx !== -1) {
    // 1. Replace detailsTab === 'experience' with placeholder
    const expPlaceholder = [
        `                {detailsTab === 'experience' && (`,
        `                  <div className="flex h-full w-full overflow-hidden bg-white dark:bg-zinc-950 p-12 justify-center items-center">`,
        `                    <p className="text-zinc-500">Experience configuration coming soon...</p>`,
        `                  </div>`,
        `                )}`
    ];
    lines.splice(expStartIdx, expEndIdx - expStartIdx, ...expPlaceholder);
    
    // The views indices might have shifted because we changed the array length
    const offset = expPlaceholder.length - (expEndIdx - expStartIdx);
    const newViewsStartIdx = viewsStartIdx + offset;
    const newViewsEndIdx = viewsEndIdx + offset;
    
    // 2. Replace activeTab === 'views' with complex block
    const viewsContent = [
        `          ) : activeTab === 'views' ? (`,
        ...complexExperienceBlock.split(/\r?\n/),
    ];
    lines.splice(newViewsStartIdx, newViewsEndIdx - newViewsStartIdx, ...viewsContent);
    
    fs.writeFileSync('c:/Projects/aurora/src/components/ModuleEditor.tsx', lines.join('\r\n'));
    console.log('Swap successful.');
} else {
    console.log('Failed to find indices', {viewsStartIdx, viewsEndIdx, expStartIdx, expEndIdx});
}
