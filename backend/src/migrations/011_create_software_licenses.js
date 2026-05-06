exports.up = function(knex) {
  return knex.schema.createTable('software_licenses', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('vendor', 255).nullable();
    table.string('license_key', 500).nullable();
    table.enu('license_type', ['org_wide', 'individual']).notNullable().defaultTo('org_wide');
    table.integer('total_seats').unsigned().notNullable().defaultTo(1);
    table.date('expiration_date').nullable();
    table.text('notes').nullable();
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('software_licenses');
};