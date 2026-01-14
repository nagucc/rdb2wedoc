const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const USERS_DIR = path.join(__dirname, '../data/users');
const SALT_ROUNDS = 10;

async function createTestUsers() {
  console.log('正在创建测试用户...');
  console.log('');

  const testUsers = [
    {
      username: 'testadmin',
      password: 'TestAdmin123',
      role: 'admin'
    },
    {
      username: 'testuser',
      password: 'TestUser123',
      role: 'user'
    }
  ];

  for (const testUser of testUsers) {
    const { username, password, role } = testUser;
    
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      username,
      email: `${username}@test.com`,
      passwordHash: hashedPassword,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 确保用户目录存在
    if (!fs.existsSync(USERS_DIR)) {
      fs.mkdirSync(USERS_DIR, { recursive: true });
    }
    
    const filePath = path.join(USERS_DIR, `${newUser.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(newUser, null, 2));

    console.log(`✓ 测试用户 ${username} 创建成功!`);
    console.log(`  用户名: ${username}`);
    console.log(`  密码: ${password}`);
    console.log(`  角色: ${role}`);
    console.log('');
  }

  console.log('测试用户创建完成!');
  console.log('');
  console.log('现在可以使用以下账户测试Header组件的角色显示：');
  console.log('1. 管理员账户: testadmin / TestAdmin123');
  console.log('2. 普通用户账户: testuser / TestUser123');
}

createTestUsers().catch(console.error);