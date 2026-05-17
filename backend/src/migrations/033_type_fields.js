// backend/src/migrations/033_type_fields.js

exports.up = async function(knex) {
  // 1. Add container_type and parent_id to utility_items
  await knex.schema.alterTable('utility_items', (table) => {
    table.string('container_type', 100).notNullable().defaultTo('bottle');
    table.integer('parent_id').unsigned().nullable()
      .references('id').inTable('utility_items')
      .onDelete('SET NULL');
  });

  // 2. Drop location_id (ignore error if already missing)
  await knex.schema.alterTable('utility_items', (table) => {
    table.dropColumn('location_id');
  }).catch(() => {});

  // 3. Add type_fields JSONB to labs
  await knex.schema.alterTable('labs', (table) => {
    table.jsonb('type_fields').notNullable().defaultTo('{}');
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('utility_items', (table) => {
    table.integer('location_id').unsigned().nullable()
      .references('id').inTable('locations');
  });
  await knex.schema.alterTable('utility_items', (table) => {
    table.dropColumn('container_type');
    table.dropColumn('parent_id');
  });
  await knex.schema.alterTable('labs', (table) => {
    table.dropColumn('type_fields');
  });
};