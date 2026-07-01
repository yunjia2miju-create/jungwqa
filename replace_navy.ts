import fs from 'fs';
import path from 'path';

function replaceInDir(dir: string, recursive: boolean = true) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && recursive) {
            replaceInDir(fullPath, recursive);
        } else if (!stat.isDirectory() && (fullPath.endsWith('.tsx') || fullPath.endsWith('.css') || fullPath.endsWith('.ts') || fullPath.endsWith('.cjs') || fullPath.endsWith('.html'))) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('#0B2545')) {
                content = content.replace(/#0B2545/g, '#0B2545');
                fs.writeFileSync(fullPath, content);
                console.log(`Replaced in ${fullPath}`);
            }
        }
    }
}

replaceInDir('./src', true);
replaceInDir('./', false);
console.log('Done replacing colors.');
