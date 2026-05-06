exports.up = function(knex) {
  return knex.schema.createTable('license_assignments', (table) => {
    table.increments('id').primary();
    table.integer('license_id').unsigned().notNullable()
         .references('id').inTable('software_licenses').onDelete('CASCADE');
    table.integer('user_id').unsigned().notNullable()
         .references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.unique(['license_id', 'user_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('license_assignments');
};