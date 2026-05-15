const fs = require('fs');
const filePath = 'c:/Projects/aurora/src/components/ModuleEditor.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const extracted = JSON.parse(fs.readFileSync('c:/Projects/aurora/scratch/extracted.json', 'utf8'));

// 1. Remove the old top-level blocks
const blocksToRemove = ['schema', 'experience', 'localization', 'map', 'assets'];

blocksToRemove.forEach(tab => {
    const searchString = `) : activeTab === '${tab}' ? (`;
    const startIndex = code.indexOf(searchString);
    if (startIndex !== -1) {
        let endIndex = code.indexOf(`) : activeTab ===`, startIndex + searchString.length);
        if (endIndex === -1) endIndex = code.indexOf(`) : null}`, startIndex);
        if (endIndex !== -1) {
            // Remove the block
            code = code.substring(0, startIndex) + code.substring(endIndex);
        }
    }
});

// 2. Fix the details block to include the sub-tabs
// Find the end of the details content area. It currently ends right before `) : activeTab === 'rules' ? (`
const rulesIndex = code.indexOf(`) : activeTab === 'rules' ? (`);

if (rulesIndex !== -1) {
    // We need to find the `</section>\n                  </div>\n                </div>\n              </div>\n            </div>` before rulesIndex.
    // The easiest way is to replace the `} {detailsTab === 'schema' && (` section that I added in `fix_layout.cjs`.
    
    // Let's just find the section I added in `fix_layout.cjs`:
    const targetString = `</section>
                  </div>
                )}
                {detailsTab === 'schema' && (
                  <div className="text-zinc-500">Schema content moved here...</div>
                )}
                {detailsTab === 'experience' && (
                  <div className="text-zinc-500">Experience content moved here...</div>
                )}
                {detailsTab === 'localization' && (
                  <div className="text-zinc-500">Localization content moved here...</div>
                )}
                {detailsTab === 'dependencies' && (
                  <div className="text-zinc-500">Dependencies content moved here...</div>
                )}
                {detailsTab === 'assets' && (
                  <div className="text-zinc-500">Assets content moved here...</div>
                )}
              </div>
            </div>`;

    if (code.includes(targetString)) {
        const replacement = `</section>
                  </div>
                )}
                {detailsTab === 'schema' && (
                  <div className="h-full w-full">
                    ${extracted.schema ? extracted.schema.replace('<div className="flex h-full w-full overflow-hidden">', '<div className="flex h-full w-full">') : ''}
                  </div>
                )}
                {detailsTab === 'experience' && (
                  <div className="h-full w-full">
                    ${extracted.experience || ''}
                  </div>
                )}
                {detailsTab === 'localization' && (
                  <div className="h-full w-full">
                    ${extracted.localization || ''}
                  </div>
                )}
                {detailsTab === 'dependencies' && (
                  <div className="h-full w-full">
                    ${extracted.map || ''}
                  </div>
                )}
                {detailsTab === 'assets' && (
                  <div className="h-full w-full">
                    ${extracted.assets || ''}
                  </div>
                )}
              </div>
            </div>`;
            
        code = code.replace(targetString, replacement);
    }
}

fs.writeFileSync(filePath, code);
console.log('Finalization complete');
