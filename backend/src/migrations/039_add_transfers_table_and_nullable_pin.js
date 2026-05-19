exports.up = async function(knex) {
  // Create chemical_container_transfers if not exists
  const hasTable = await knex.schema.hasTable('chemical_container_transfers');
  if (!hasTable) {
    await knex.schema.createTable('chemical_container_transfers', (table) => {
      table.increments('id').primary();
      table.integer('container_id').unsigned().notNullable()
        .references('id').inTable('chemical_containers').onDelete('CASCADE');
      table.integer('from_location_id').unsigned().notNullable()
        .references('id').inTable('locations');
      table.integer('to_location_id').unsigned().notNullable()
        .references('id').inTable('locations');
      table.integer('performed_by').unsigned()
        .references('id').inTable('users');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Make pin_5 nullable (if not already)
  await knex.raw('ALTER TABLE chemical_containers ALTER COLUMN pin_5 DROP NOT NULL');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('chemical_container_transfers');
  // Re‑add NOT NULL (be careful – might fail if nulls exist)
  await knex.raw('ALTER TABLE chemical_containers ALTER COLUMN pin_5 SET NOT NULL');
};