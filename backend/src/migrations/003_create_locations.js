exports.up = function(knex) {
  return knex.schema.createTable('locations', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.enu('type', ['main', 'lab_sub']).notNullable();
    table.integer('lab_id').unsigned().nullable()
         .references('id').inTable('labs').onDelete('CASCADE');
    table.integer('parent_id').unsigned().nullable()
         .references('id').inTable('locations').onDelete('SET NULL');
    table.string('description', 500).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('locations');
};