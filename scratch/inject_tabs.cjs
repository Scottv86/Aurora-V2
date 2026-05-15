const fs = require('fs');
const filePath = 'c:/Projects/aurora/src/components/ModuleEditor.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const extractedData = JSON.parse(fs.readFileSync('c:/Projects/aurora/scratch/extracted.json', 'utf8'));

// Inject each block
if (extractedData.schema) {
    content = content.replace(
        '<div className="text-zinc-500">Schema content moved here...</div>',
        extractedData.schema.replace('<div className="flex h-full w-full overflow-hidden">', '<div className="h-full w-full">')
    );
}

if (extractedData.experience) {
    content = content.replace(
        '<div className="text-zinc-500">Experience content moved here...</div>',
        extractedData.experience
    );
}

if (extractedData.localization) {
    content = content.replace(
        '<div className="text-zinc-500">Localization content moved here...</div>',
        extractedData.localization
    );
}

// Note: Map was renamed to Dependencies by the user
if (extractedData.map) {
    content = content.replace(
        '<div className="text-zinc-500">Dependencies content moved here...</div>',
        extractedData.map
    );
}

if (extractedData.assets) {
    content = content.replace(
        '<div className="text-zinc-500">Assets content moved here...</div>',
        extractedData.assets
    );
}

fs.writeFileSync(filePath, content);
console.log('Injection complete');
