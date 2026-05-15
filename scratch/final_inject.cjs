const fs = require('fs');

const code = fs.readFileSync('c:/Projects/aurora/src/components/ModuleEditor.tsx', 'utf8');
const lines = code.split(/\r?\n/);

const extracted = JSON.parse(fs.readFileSync('c:/Projects/aurora/scratch/extracted.json', 'utf8'));

// Find start of details content
const detailsContentIdx = lines.findIndex(l => l.includes('className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-12 custom-scrollbar"'));

if (detailsContentIdx !== -1 && !lines[detailsContentIdx + 1].includes('detailsTab === \'general\'')) {
    lines.splice(detailsContentIdx + 1, 0, "                {detailsTab === 'general' && (");
}

// Find end of details block which is just before `activeTab === 'rules'`
const rulesIdx = lines.findIndex(l => l.includes(") : activeTab === 'rules' ? ("));

if (rulesIdx !== -1) {
    // We expect the 4 lines before it to be `</div>`, `</div>`, `</div>`, `</div>`
    // Wait, the structure was:
    //                   </div> // closes gap-10
    //                 </div> // closes max-w-none
    //               </div> // closes flex-1 overflow-y-auto
    //             </div> // closes flex h-full w-full
    // Let's insert our sub-tabs right after the `</div>` that closes max-w-none.
    
    // The rulesIdx line is `          ) : activeTab === 'rules' ? (`
    // rulesIdx - 1 is `            </div>` (closes flex h-full w-full)
    // rulesIdx - 2 is `              </div>` (closes flex-1)
    
    const insertionIdx = rulesIdx - 2;
    
    // We will insert `)}` to close `detailsTab === 'general'`, then the new tabs.
    const newLines = [
        `                )}`,
        `                {detailsTab === 'schema' && (`,
        `                  <div className="h-full w-full">`,
        extracted.schema ? extracted.schema.replace('<div className="flex h-full w-full overflow-hidden">', '<div className="flex h-full w-full">') : '',
        `                  </div>`,
        `                )}`,
        `                {detailsTab === 'experience' && (`,
        `                  <div className="h-full w-full">`,
        extracted.experience || '',
        `                  </div>`,
        `                )}`,
        `                {detailsTab === 'localization' && (`,
        `                  <div className="h-full w-full">`,
        extracted.localization || '',
        `                  </div>`,
        `                )}`,
        `                {detailsTab === 'dependencies' && (`,
        `                  <div className="h-full w-full">`,
        extracted.map || '',
        `                  </div>`,
        `                )}`,
        `                {detailsTab === 'assets' && (`,
        `                  <div className="h-full w-full">`,
        extracted.assets || '',
        `                  </div>`,
        `                )}`
    ];
    
    lines.splice(insertionIdx, 0, ...newLines);
}

fs.writeFileSync('c:/Projects/aurora/src/components/ModuleEditor.tsx', lines.join('\r\n'));
console.log('Injection successful');
