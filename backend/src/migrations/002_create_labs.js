exports.up = function(knex) {
  return knex.schema.createTable('labs', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable().unique();
    table.string('description', 500).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('labs');
};