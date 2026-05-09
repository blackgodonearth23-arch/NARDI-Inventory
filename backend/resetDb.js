const db = require('./src/config/db');
const User = require('./src/models/User');

async function resetDatabase() {
  console.log('Resetting database...');

  // Truncate all tables in correct order (to avoid FK violations)
  await db.raw(`
    TRUNCATE TABLE
      alerts,
      transactions,
      chemical_bottles,
      chemicals,
      equipment,
      utensils,
      ict_hardware,
      software_licenses,
      license_assignments,
      utility_items,
      locations,
      labs,
      users
    RESTART IDENTITY CASCADE
  `);

  // Create default admin
  const admin = await User.create({
    email: 'admin@nardi.org',
    password: 'admin123',
    display_name: 'System Admin',
    role: 'admin'
  });

  console.log('✅ Database reset. Admin user created:');
  console.log('   Email   :', admin.email);
  console.log('   Password: admin123');
  console.log('   Role    :', admin.role);
  console.log('   ID      :', admin.id);

  process.exit(0);
}

resetDatabase().catch(err => {
  console.error('Failed to reset DB:', err);
  process.exit(1);
});