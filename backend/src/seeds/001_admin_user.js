const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('users').del();

  const passwordHash = await bcrypt.hash('Admin123!', 12);

  await knex('users').insert([
    {
      email: 'admin@nardi.local',
      password_hash: passwordHash,
      display_name: 'Admin User',
      role: 'admin',
      lab_id: null,
      pin_4_hash: null,
      is_active: true
    }
    // You can add more initial users here
  ]);
};