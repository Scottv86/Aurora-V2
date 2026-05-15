const fs = require('fs');

const code = fs.readFileSync('c:/Projects/aurora/src/components/ModuleEditor.tsx', 'utf8');

const extracted = JSON.parse(fs.readFileSync('c:/Projects/aurora/scratch/extracted.json', 'utf8'));
const complexExperienceBlock = extracted.experience;

// Find the views block
const viewsStartStr = `          ) : activeTab === 'views' ? (\n`;
const viewsStartIdx = code.indexOf(viewsStartStr);
const viewsEndStr = `          ) : activeTab === 'security' ? (\n`;
const viewsEndIdx = code.indexOf(viewsEndStr, viewsStartIdx);

let placeholderViewsBlock = '';
if (viewsStartIdx !== -1 && viewsEndIdx !== -1) {
    placeholderViewsBlock = code.substring(viewsStartIdx + viewsStartStr.length, viewsEndIdx);
}

// Find the detailsTab === 'experience' block
const expStartStr = `                {detailsTab === 'experience' && (\n                  <div className="h-full w-full">\n`;
const expStartIdx = code.indexOf(expStartStr);
// Find the end of it which is the `                  </div>\n                )}\n                {detailsTab === 'localization' && (`
const expEndStr = `                  </div>\n                )}\n                {detailsTab === 'localization' && (\n`;
const expEndIdx = code.indexOf(expEndStr, expStartIdx);

if (viewsStartIdx !== -1 && viewsEndIdx !== -1 && expStartIdx !== -1 && expEndIdx !== -1) {
    let newCode = code.substring(0, expStartIdx + expStartStr.length) +
                  `<div className="flex h-full w-full overflow-hidden bg-white dark:bg-zinc-950 p-12 justify-center items-center"><p className="text-zinc-500">Experience configuration placeholder</p></div>\n` +
                  code.substring(expEndIdx, viewsStartIdx + viewsStartStr.length) +
                  complexExperienceBlock + `\n` +
                  code.substring(viewsEndIdx);
                  
    fs.writeFileSync('c:/Projects/aurora/src/components/ModuleEditor.tsx', newCode);
    console.log('Swap complete.');
} else {
    console.log('Failed to find indices', {viewsStartIdx, viewsEndIdx, expStartIdx, expEndIdx});
}
