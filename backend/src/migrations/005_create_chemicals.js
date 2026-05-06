exports.up = function(knex) {
  return knex.schema.createTable('chemicals', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('cas_number', 50).nullable();
    table.string('unit', 50).notNullable().defaultTo('bottle');  // 'bottle', 'ml', 'g', etc.
    table.integer('reorder_threshold').unsigned().notNullable().defaultTo(1);
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('chemicals');
};