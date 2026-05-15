const fs = require('fs');

let code = fs.readFileSync('c:/Projects/aurora/src/components/ModuleEditor.tsx', 'utf8');
const lines = code.split(/\r?\n/);

const extracted = JSON.parse(fs.readFileSync('c:/Projects/aurora/scratch/extracted.json', 'utf8'));
const complexExperienceBlock = extracted.experience;

// Find views block start and end
const viewsStartIdx = lines.findIndex(l => l.includes(") : activeTab === 'views' ? ("));
const viewsEndIdx = lines.findIndex((l, idx) => idx > viewsStartIdx && l.includes(") : null}"));

// Find experience subtab block start and end
const expStartIdx = lines.findIndex(l => l.includes("{detailsTab === 'experience' && ("));
const expEndIdx = lines.findIndex((l, idx) => idx > expStartIdx && l.includes("{detailsTab === 'localization' && ("));

if (viewsStartIdx !== -1 && viewsEndIdx !== -1 && expStartIdx !== -1 && expEndIdx !== -1) {
    // 1. Replace detailsTab === 'experience' with placeholder
    const expPlaceholder = [
        `                {detailsTab === 'experience' && (`,
        `                  <div className="flex h-full w-full p-12 justify-center items-center">`,
        `                    <p className="text-zinc-500">Experience configuration placeholder</p>`,
        `                  </div>`,
        `                )}`
    ];
    lines.splice(expStartIdx, expEndIdx - expStartIdx, ...expPlaceholder);
    
    // Recalculate viewsStartIdx and viewsEndIdx after the array length change
    const offset = expPlaceholder.length - (expEndIdx - expStartIdx);
    const newViewsStartIdx = viewsStartIdx + offset;
    const newViewsEndIdx = viewsEndIdx + offset;
    
    // 2. Replace activeTab === 'views' with the complex block
    const viewsContent = [
        `            ) : activeTab === 'views' ? (`,
        ...complexExperienceBlock.split(/\r?\n/),
    ];
    lines.splice(newViewsStartIdx, newViewsEndIdx - newViewsStartIdx, ...viewsContent);
    
    fs.writeFileSync('c:/Projects/aurora/src/components/ModuleEditor.tsx', lines.join('\r\n'));
    console.log('Swap successful.');
} else {
    console.log('Failed to find indices', {viewsStartIdx, viewsEndIdx, expStartIdx, expEndIdx});
}
