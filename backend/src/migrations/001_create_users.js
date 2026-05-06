exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();           // bcrypt hash (null for initial admin if inserted manually? We'll require)
    table.string('display_name', 255).notNullable();
    table.enu('role', ['admin', 'lab_keeper', 'ict_keeper', 'lab_user'])
         .notNullable().defaultTo('lab_user');
    table.integer('lab_id').unsigned().nullable()
    table.string('pin_4_hash', 60).nullable();                  // bcrypt hash of 4-digit PIN (only for lab users)
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.boolean('is_active').defaultTo(true);                 // soft disable
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};