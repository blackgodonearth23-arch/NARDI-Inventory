exports.up = function(knex) {
  return knex.schema.createTable('utility_items', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.enum('type', [
      'glassware', 'plasticware', 'equipment', 'instrument',
      'standard', 'consumable_sanitation', 'ppe', 'utensil'
    ]).notNullable();
    table.integer('location_id').unsigned().references('id').inTable('locations').onDelete('SET NULL');
    table.integer('total_count').defaultTo(1);                     // for countable items
    table.enu('status', ['working', 'broken', 'under_repair']).defaultTo('working');
    table.string('org_serial', 100).nullable();                    // original serial
    table.jsonb('properties').defaultTo('{}');                     // type‑specific columns
    table.boolean('is_deleted').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Add indexes
  return Promise.all([
    knex.schema.raw('CREATE INDEX idx_utility_type ON utility_items (type)'),
    knex.schema.raw('CREATE INDEX idx_utility_location ON utility_items (location_id, is_deleted)'),
    knex.schema.raw('CREATE INDEX idx_utility_status ON utility_items (status, is_deleted)')
  ]);
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('utility_items');
};