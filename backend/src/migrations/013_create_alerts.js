exports.up = function(knex) {
  return knex.schema.createTable('alerts', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
         .references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', ['low_stock', 'broken_equipment', 'license_expiry', 'info']).notNullable();
    table.string('message', 500).notNullable();
    table.boolean('is_read').notNullable().defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('alerts');
};