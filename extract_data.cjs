const fs = require('fs');
const path = require('path');

const sqlFilePath = '/Users/jora/Desktop/ghazarqn_drive 3.sql';
const outputFilePath = '/Users/jora/myAi/ionic-drive-app/src/assets/seed.json';

function extractInserts(tableName, sqlContent) {
    const regex = new RegExp(`INSERT INTO \`${tableName}\` .*? VALUES[\\s\\S]*?;`, 'g');
    const matches = sqlContent.match(regex);
    if (!matches) return [];
    
    const allValues = [];
    matches.forEach(match => {
        // Extract the part between VALUES and ;
        const valuesPart = match.substring(match.indexOf('VALUES') + 6, match.lastIndexOf(';')).trim();
        
        // Simple parser for (v1, v2, ...), (v3, v4, ...)
        let currentPos = 0;
        while (currentPos < valuesPart.length) {
            if (valuesPart[currentPos] === '(') {
                let endPos = currentPos + 1;
                let openParens = 1;
                let inString = false;
                let stringChar = '';
                
                while (endPos < valuesPart.length && openParens > 0) {
                    const char = valuesPart[endPos];
                    if (inString) {
                        if (char === stringChar && valuesPart[endPos - 1] !== '\\\\') {
                            inString = false;
                        }
                    } else {
                        if (char === "'" || char === '"') {
                            inString = true;
                            stringChar = char;
                        } else if (char === '(') {
                            openParens++;
                        } else if (char === ')') {
                            openParens--;
                        }
                    }
                    endPos++;
                }
                
                const row = valuesPart.substring(currentPos + 1, endPos - 1);
                // Split by comma but not within strings
                const cells = [];
                let currentCell = '';
                let cellInString = false;
                let cellStringChar = '';
                
                for (let i = 0; i < row.length; i++) {
                    const c = row[i];
                    if (cellInString) {
                        currentCell += c;
                        if (c === cellStringChar && row[i-1] !== '\\\\') {
                            cellInString = false;
                        }
                    } else {
                        if (c === "'" || c === '"') {
                            cellInString = true;
                            cellStringChar = c;
                            currentCell += c;
                        } else if (c === ',') {
                            cells.push(currentCell.trim());
                            currentCell = '';
                        } else {
                            currentCell += c;
                        }
                    }
                }
                cells.push(currentCell.trim());
                allValues.push(cells.map(c => {
                    if (c === 'NULL') return null;
                    if (c.startsWith("'") && c.endsWith("'")) return c.substring(1, c.length - 1).replace(/\\\\'/g, "'").replace(/\\\\n/g, "\\n");
                    return c;
                }));
                
                currentPos = endPos;
            } else {
                currentPos++;
            }
        }
    });
    return allValues;
}

console.log('Reading SQL file...');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

const tables = [
    'languages',
    'questions',
    'question_translations',
    'answers',
    'answer_translations',
    'groups',
    'group_translations',
    'exploitation_translations',
    'road_signs',
    'road_sign_translations',
    'road_sign_categories',
    'road_sign_category_translations'
];

const data = {};

tables.forEach(table => {
    console.log(`Extracting ${table}...`);
    data[table] = extractInserts(table, sqlContent);
});

console.log('Writing seed.json...');
fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2));
console.log('Done!');
