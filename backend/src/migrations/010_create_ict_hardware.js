exports.up = function(knex) {
  return knex.schema.createTable('ict_hardware', (table) => {
    table.increments('id').primary();
    table.string('org_serial', 100).notNullable().unique();
    table.enu('type', ['pc', 'printer', 'monitor', 'peripheral', 'other']).notNullable();
    table.string('model', 255).nullable();
    table.enu('status', ['available', 'in_use', 'under_repair', 'decommissioned']).notNullable().defaultTo('available');
    table.integer('location_id').unsigned().nullable()
         .references('id').inTable('locations').onDelete('SET NULL');
    table.integer('assigned_to_user_id').unsigned().nullable()
         .references('id').inTable('users').onDelete('SET NULL');
    table.date('purchase_date').nullable();
    table.text('notes').nullable();
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('ict_hardware');
};