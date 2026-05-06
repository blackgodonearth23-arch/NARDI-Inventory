exports.up = function(knex) {
  return knex.schema.createTable('utensils', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.integer('location_id').unsigned().notNullable()
         .references('id').inTable('locations').onDelete('RESTRICT');
    table.integer('total_count').unsigned().notNullable().defaultTo(0);
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('utensils');
};