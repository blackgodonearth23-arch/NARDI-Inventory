exports.up = function(knex) {
  return knex.schema.createTable('equipment', (table) => {
    table.increments('id').primary();
    table.string('org_serial', 100).notNullable().unique();      // organisation serial number
    table.string('name', 255).notNullable();
    table.string('type', 100).notNullable();                     // e.g., microscope, centrifuge
    table.integer('location_id').unsigned().notNullable()
         .references('id').inTable('locations').onDelete('RESTRICT');
    table.enu('status', ['available', 'in_use', 'broken', 'retired']).notNullable().defaultTo('available');
    table.integer('assigned_to_user_id').unsigned().nullable()
         .references('id').inTable('users').onDelete('SET NULL');
    table.date('purchase_date').nullable();
    table.text('notes').nullable();
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('equipment');
};