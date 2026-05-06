exports.up = function(knex) {
  return knex.schema.createTable('chemical_bottles', (table) => {
    table.increments('id').primary();
    table.integer('chemical_id').unsigned().notNullable()
         .references('id').inTable('chemicals').onDelete('RESTRICT');
    table.string('pin_5', 5).notNullable().unique();           // 5-digit unique PIN, printed on bottle
    table.integer('location_id').unsigned().notNullable()
         .references('id').inTable('locations').onDelete('RESTRICT');
    table.enu('status', ['unopened', 'opened']).notNullable().defaultTo('unopened');
    table.integer('opened_by').unsigned().nullable()
         .references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('opened_at').nullable();
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamps(true, true);                  // created_at, updated_at
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('chemical_bottles');
};