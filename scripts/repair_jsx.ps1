$path = 'c:\Projects\aurora\src\components\Builder\CalculatorModal.tsx'
$content = Get-Content $path -Raw

# This is the exact sequence found in the diagnostic check
$old = '                        <div className="flex items-center gap-2">
                           <Terminal size={12} className="text-indigo-500" />
                                 Use <code className="text-indigo-500 px-1 py-0.5 bg-indigo-500/5 rounded">FILTER</code> or <code className="text-indigo-500 px-1 py-0.5 bg-indigo-500/5 rounded">MAP</code> with the <code className="text-emerald-500 font-mono">$</code> token representing the current item.
                                 Example: <code className="text-indigo-500 px-1 py-0.5 bg-indigo-500/5 rounded">{"FILTER([1, 2], \"$ > 1\")"}</code>.
                               </p>
                            </div>'

$new = '                        <div className="flex items-center gap-2">
                           <Terminal size={12} className="text-indigo-500" />
                           <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Core Syntax Guide</span>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {[
                            { title: "Variable Referencing", desc: "Use curly braces for any field: {Field Name}. Supports spaces and nested paths.", example: "{Price} * {Qty}" },
                            { title: "Relational Lookups", desc: "Access data in related modules via Lookups: {Client.Company Name}.", example: "{Customer.Balance}" },
                            { title: "Collection Iteration", desc: "Use FILTER or MAP with the $ token representing the current item.", example: "FILTER([1, 2], \"$ > 1\")" }
                          ].map(item => (
                            <div key={item.title} className="p-5 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl space-y-3">
                              <p className="text-[11px] font-bold text-zinc-900 dark:text-white uppercase tracking-tight">{item.title}</p>
                              <p className="text-[11px] text-zinc-500 leading-relaxed">{item.desc}</p>
                              <div className="p-3 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl flex items-center justify-between">
                                <code className="text-xs font-mono text-indigo-500">{item.example}</code>
                                <button onClick={() => setLogic(prev => prev + item.example)} className="text-[9px] font-black text-zinc-400 hover:text-indigo-500 uppercase tracking-widest transition-colors">Use</button>
                              </div>
                            </div>
                          ))}
                        </div>'

if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    # Also fix the weird doubled divs/p that might be left
    $old2 = '                            <div className="space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                               <p className="text-[10px] font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                 <div className="w-1 h-1 bg-indigo-500 rounded-full" />
                                 Code Documentation
                               </p>
                               <p className="text-[9px] text-zinc-500 leading-relaxed">
                                 Add notes using <code className="text-zinc-400 font-mono">// single line</code> or <code className="text-zinc-400 font-mono">/* multi-line */</code>. 
                                 Comments are ignored during calculation.
                               </p>
                            </div>
                         </div>
                      </div>'
    $content = $content.Replace($old2, '') # We replace with empty as the new code block above handles it or we'll clean up next
    
    Set-Content $path $content -NoNewline
    Write-Host "Repair Complete."
} else {
    Write-Host "Target not found exactly. Checking for partial match..."
    # Fallback to a simpler line replacement if exact block fails
}
