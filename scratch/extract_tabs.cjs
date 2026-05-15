const fs = require('fs');
const filePath = 'c:/Projects/aurora/src/components/ModuleEditor.tsx';
let content = fs.readFileSync(filePath, 'utf8');

function extractBlock(tabName) {
    const searchString = `) : activeTab === '${tabName}' ? (`;
    const startIndex = content.indexOf(searchString);
    if (startIndex === -1) return null;
    
    // Find the end of this block by finding the next `) : activeTab ===` or the final fallback
    let endIndex = content.indexOf(`) : activeTab ===`, startIndex + searchString.length);
    if (endIndex === -1) {
        // Find the final fallback which might be `) : null}` or something similar
        endIndex = content.indexOf(`) : null}`, startIndex);
    }
    
    if (endIndex === -1) return null;

    const block = content.substring(startIndex + searchString.length, endIndex).trim();
    // Remove it from the original content
    content = content.substring(0, startIndex) + content.substring(endIndex);
    return block;
}

const tabsToExtract = ['schema', 'experience', 'localization', 'map', 'assets'];
const extractedBlocks = {};

tabsToExtract.forEach(tab => {
    const block = extractBlock(tab);
    if (block) {
        extractedBlocks[tab] = block;
    }
});

// Now insert them into the details block
// The details block starts with `) : activeTab === 'details' ? (`
const detailsStart = content.indexOf(`) : activeTab === 'details' ? (`);
if (detailsStart !== -1) {
    const detailsContentStartStr = `{/* Details Content */}
              <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-12 custom-scrollbar">`;
    const detailsContentStartIdx = content.indexOf(detailsContentStartStr, detailsStart);
    
    if (detailsContentStartIdx !== -1) {
        // Find the end of the details block
        const detailsEndIdx = content.indexOf(`) : activeTab ===`, detailsContentStartIdx);
        if (detailsEndIdx !== -1) {
            // Find the closing divs
            // The structure is:
            // <div className="max-w-none mx-auto space-y-12 pb-20">
            // ...
            // </div>
            // </div>
            // </div>
            // </div>
            
            // For now, I will just append the new sections at the end of the details content area
            // Before the last 4 closing divs of the details block.
            
            // This is better done with a reliable regex or string match
        }
    }
}

fs.writeFileSync('c:/Projects/aurora/scratch/extracted.json', JSON.stringify(extractedBlocks, null, 2));
