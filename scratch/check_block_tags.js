import fs from 'fs';

const content = fs.readFileSync('C:/Projects/aurora/src/components/ModuleEditor.tsx', 'utf8');
const lines = content.split('\n');
const block = lines.slice(6847, 8863).join('\n');

function checkJSX(code, startLine) {
    let stack = [];
    const tagRegex = /<(\/?[a-zA-Z0-9\.]+)(?:\s+[^>]*?)?(\/?)>/g;
    let match;
    let line = startLine;
    let lastIndex = 0;

    while ((match = tagRegex.exec(code)) !== null) {
        // Count lines
        const chunk = code.substring(lastIndex, match.index);
        line += (chunk.match(/\n/g) || []).length;
        lastIndex = match.index;

        const tagName = match[1];
        const isClosing = tagName.startsWith('/');
        const isSelfClosing = match[2] === '/';

        if (isSelfClosing) continue;

        if (isClosing) {
            const closingName = tagName.substring(1);
            if (stack.length === 0) {
                console.log(`Unexpected closing tag </${closingName}> at line ${line}`);
            } else {
                const opening = stack.pop();
                if (opening.name !== closingName) {
                    console.log(`Mismatched tag: expected </${opening.name}> but found </${closingName}> at line ${line} (opened at line ${opening.line})`);
                }
            }
        } else {
            stack.push({ name: tagName, line: line });
        }
    }

    while (stack.length > 0) {
        const opening = stack.pop();
        console.log(`Unclosed tag <${opening.name}> opened at line ${opening.line}`);
    }
}

checkJSX(block, 6848);
