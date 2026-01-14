const fs = require('fs');
const path = require('path');

const USERS_DIR = path.join(__dirname, '../data/users');

function updateUserRole(username, newRole) {
  // 确保用户目录存在
  if (!fs.existsSync(USERS_DIR)) {
    console.log(`✗ 用户目录 ${USERS_DIR} 不存在`);
    return false;
  }
  
  const files = fs.readdirSync(USERS_DIR);
  
  for (const file of files) {
    const filePath = path.join(USERS_DIR, file);
    const user = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (user.username === username) {
      user.role = newRole;
      user.updatedAt = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(user, null, 2));
      console.log(`✓ 用户 ${username} 的角色已更新为 ${newRole}`);
      return true;
    }
  }
  
  console.log(`✗ 未找到用户 ${username}`);
  return false;
}

const username = process.argv[2];
const newRole = process.argv[3];

if (!username || !newRole) {
  console.log('用法: node scripts/updateUserRole.js <username> <role>');
  console.log('示例: node scripts/updateUserRole.js admin admin');
  process.exit(1);
}

updateUserRole(username, newRole);