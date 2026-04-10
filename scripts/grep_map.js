import fs from 'fs';
import path from 'path';

let out = [];
function searchDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            searchDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            let found = false;
            lines.forEach((line, i) => {
                if (line.includes('.map(') || line.includes('.map (')) {
                    if (!found) {
                        out.push('--- ' + fullPath + ' ---');
                        found = true;
                    }
                    out.push(`${i+1}: ${line.trim()}`);
                }
            });
        }
    }
}
searchDir('src');
fs.writeFileSync('map_results.txt', out.join('\n'));
