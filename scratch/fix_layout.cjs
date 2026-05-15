const fs = require('fs');
const filePath = 'c:/Projects/aurora/src/components/ModuleEditor.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add detailsTab state
if (!content.includes('const [detailsTab')) {
    content = content.replace(
        /const \[activeTab, setActiveTab\] = useState[^;]+;/,
        match => `${match}\n  const [detailsTab, setDetailsTab] = useState<'general' | 'schema' | 'experience' | 'localization' | 'dependencies' | 'assets'>('general');`
    );
}

// 2. Update Tabs array
content = content.replace(
    /\(\['details', 'schema', 'builder', 'workflow', 'rules', 'views', 'experience', 'security', 'localization', 'map', 'assets', 'forms', 'deployment'\] as const\)/,
    "(['details', 'builder', 'forms', 'workflow', 'rules', 'views', 'security', 'deployment'] as const)"
);

// 3. Make all pages full width
content = content.replace(/max-w-4xl/g, 'max-w-none');
content = content.replace(/max-w-5xl/g, 'max-w-none');
content = content.replace(/max-w-6xl/g, 'max-w-none');
content = content.replace(/max-w-7xl/g, 'max-w-none');

// 4. Update Header Heights
content = content.replace(/h-14 border-b/g, 'h-[52px] border-b');

// 5. Update Details Sidebar
const sidebarOld = `<aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-2">
                <div className="mb-6 px-2">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Configuration</h3>
                </div>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all text-left">
                  <Settings2 size={14} />
                  General Properties
                </button>
              </aside>`;

const sidebarNew = `<aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-2">
                <div className="mb-6 px-2">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Configuration</h3>
                </div>
                {[
                  { id: 'general', label: 'General Properties', icon: Settings2 },
                  { id: 'schema', label: 'Schema', icon: Database },
                  { id: 'experience', label: 'Experience', icon: Sparkles },
                  { id: 'localization', label: 'Localization', icon: Globe },
                  { id: 'dependencies', label: 'Dependencies', icon: MapPin },
                  { id: 'assets', label: 'Assets', icon: Image }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailsTab(tab.id as any)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left",
                      detailsTab === tab.id
                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    )}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </aside>`;
content = content.replace(sidebarOld, sidebarNew);

// 6. Wrap Details Content in `detailsTab === 'general'`
const detailsContentStart = `{/* Details Content */}
              <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-12 custom-scrollbar">`;
const detailsContentNew = `{/* Details Content */}
              <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-12 custom-scrollbar">
                {detailsTab === 'general' && (`;
content = content.replace(detailsContentStart, detailsContentNew);

const detailsContentEnd = `</section>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'rules' ? (`;
const detailsContentEndNew = `</section>
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
            </div>
          ) : activeTab === 'rules' ? (`;

// We have to extract the actual blocks for Schema, Experience, Localization, Map, Assets
// and replace them into details section, then remove them from the top level.

fs.writeFileSync('c:/Projects/aurora/src/components/ModuleEditor.tsx', content);
console.log('Done basic replacements.');
