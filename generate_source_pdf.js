const fs = require('fs');
const path = require('path');

const projectDir = '/Users/na57/workshop/rdb2wedoc';
const outputFile = path.join(projectDir, 'source_pdf.md');

const ignoreDirs = [
  '.next',
  'node_modules',
  '.git',
  '.vscode',
  '.trae',
  '__tests__',
  'e2e'
];

const ignoreFiles = [
  '.d.ts',
  'jest.config.js',
  'jest.setup.js',
  'playwright.config.ts',
  'next.config.ts',
  'middleware.ts',
  'instrumentation.ts',
  '.test.',
  '.spec.'
];

const extensions = ['.ts', '.tsx', '.js', '.jsx'];

function shouldIgnore(filePath) {
  const relativePath = path.relative(projectDir, filePath);
  const pathParts = relativePath.split(path.sep);
  
  for (const ignoreDir of ignoreDirs) {
    if (pathParts.includes(ignoreDir)) {
      return true;
    }
  }
  
  for (const ignoreFile of ignoreFiles) {
    if (relativePath.endsWith(ignoreFile)) {
      return true;
    }
  }
  
  if (pathParts.includes('__tests__')) {
    return true;
  }
  
  if (relativePath.includes('.test.') || relativePath.includes('.spec.')) {
    return true;
  }
  
  return false;
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!ignoreDirs.includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext) && !shouldIgnore(filePath)) {
        fileList.push(filePath);
      }
    }
  }
  
  return fileList;
}

function removeEmptyLines(content) {
  return content.split('\n').filter(line => line.trim() !== '').join('\n');
}

function getRelativePath(filePath, baseDir) {
  return path.relative(baseDir, filePath);
}

function processFiles() {
  const allFiles = getAllFiles(projectDir);
  const sortedFiles = allFiles.sort();
  
  console.log(`找到 ${sortedFiles.length} 个文件`);
  
  let content = '';
  let totalLines = 0;
  
  for (const filePath of sortedFiles) {
    if (!fs.existsSync(filePath)) continue;
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const cleanedContent = removeEmptyLines(fileContent);
    const lines = cleanedContent.split('\n');
    
    if (totalLines > 3000) {
      console.log(`当前总行数已超过3000行，停止处理。当前总行数: ${totalLines}`);
      break;
    }
    
    const fileName = getRelativePath(filePath, projectDir);
    content += `## ${fileName}\n\n`;
    content += '```typescript\n';
    content += cleanedContent;
    content += '\n```\n\n';
    
    totalLines += lines.length;
    console.log(`已处理: ${fileName} (${lines.length} 行) - 累计: ${totalLines} 行`);
  }
  
  fs.writeFileSync(outputFile, content, 'utf-8');
  console.log(`\n完成！共处理 ${totalLines} 行代码，输出到 ${outputFile}`);
  console.log(`文件总行数: ${content.split('\n').length}`);
}

processFiles();
