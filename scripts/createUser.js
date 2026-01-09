const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const USERS_DIR = path.join(__dirname, '..', 'data', 'users');
const SALT_ROUNDS = 10;

function printUsage() {
  console.log('用法: node createUser.js <username> <password>');
  console.log('');
  console.log('参数:');
  console.log('  username  用户名 (3-20个字符，仅限字母、数字和下划线)');
  console.log('  password  密码 (至少8个字符，包含大小写字母和数字)');
  console.log('');
  console.log('示例:');
  console.log('  node createUser.js admin Admin123');
}

function validateUsername(username) {
  if (!username) {
    return { valid: false, error: '用户名不能为空' };
  }

  if (username.length < 3 || username.length > 20) {
    return { valid: false, error: '用户名长度必须在3-20个字符之间' };
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, error: '用户名只能包含字母、数字和下划线' };
  }

  return { valid: true };
}

function validatePassword(password) {
  if (!password) {
    return { valid: false, error: '密码不能为空' };
  }

  if (password.length < 8) {
    return { valid: false, error: '密码长度必须至少为8个字符' };
  }

  if (password.length > 128) {
    return { valid: false, error: '密码长度不能超过128个字符' };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return { valid: false, error: '密码必须包含大小写字母和数字' };
  }

  return { valid: true };
}

function loadUsers() {
  try {
    if (!fs.existsSync(USERS_DIR)) {
      return [];
    }

    const files = fs.readdirSync(USERS_DIR).filter(file => file.endsWith('.json'));
    const users = [];

    files.forEach(file => {
      const filePath = path.join(USERS_DIR, file);
      const data = fs.readFileSync(filePath, 'utf8');
      const user = JSON.parse(data);
      users.push(user);
    });

    return users;
  } catch (error) {
    console.error('读取用户数据失败:', error.message);
    return [];
  }
}

function saveUser(user) {
  try {
    if (!fs.existsSync(USERS_DIR)) {
      fs.mkdirSync(USERS_DIR, { recursive: true });
    }

    const filePath = path.join(USERS_DIR, `${user.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(user, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('保存用户数据失败:', error.message);
    return false;
  }
}

function checkUserExists(username) {
  const users = loadUsers();
  return users.some(user => user.username === username);
}

async function createUser(username, password) {
  console.log('正在创建用户账户...');
  console.log('');

  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    console.error('用户名验证失败:', usernameValidation.error);
    return false;
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    console.error('密码验证失败:', passwordValidation.error);
    return false;
  }

  if (checkUserExists(username)) {
    console.error('错误: 用户名已存在');
    return false;
  }

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      username,
      email: `${username}@example.com`,
      passwordHash: hashedPassword,
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!saveUser(newUser)) {
      console.error('错误: 保存用户数据失败');
      return false;
    }

    console.log('✓ 用户账户创建成功!');
    console.log('');
    console.log('用户信息:');
    console.log(`  用户名: ${username}`);
    console.log(`  角色: ${newUser.role}`);
    console.log(`  创建时间: ${newUser.createdAt}`);
    console.log('');
    console.log('注意: 请妥善保管您的密码，系统不会存储明文密码。');

    return true;
  } catch (error) {
    console.error('创建用户失败:', error.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    process.exit(0);
  }

  if (args.length < 2) {
    console.error('错误: 缺少必要参数');
    console.log('');
    printUsage();
    process.exit(1);
  }

  const username = args[0];
  const password = args[1];

  const success = await createUser(username, password);
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('发生未预期的错误:', error.message);
  process.exit(1);
});
