exports.up = async function(knex) {
  // 1. Add physical_form to chemicals
  await knex.schema.table('chemicals', (table) => {
    table.string('physical_form', 50).defaultTo('liquid');
  });

  // 2. Rename chemical_bottles to chemical_containers
  await knex.schema.renameTable('chemical_bottles', 'chemical_containers');

  // 3. Add container_type column
  await knex.schema.table('chemical_containers', (table) => {
    table.string('container_type', 50).defaultTo('glass_bottle');
  });

  // 4. Rebuild unique PIN index on new table
  await knex.raw('DROP INDEX IF EXISTS idx_unique_active_pin');
  await knex.raw(`
    CREATE UNIQUE INDEX idx_unique_active_pin 
    ON chemical_containers (pin_5) 
    WHERE is_deleted = false
  `);
};

exports.down = async function(knex) {
  await knex.schema.table('chemicals', (table) => {
    table.dropColumn('physical_form');
  });
  await knex.schema.table('chemical_containers', (table) => {
    table.dropColumn('container_type');
  });
  await knex.schema.renameTable('chemical_containers', 'chemical_bottles');
  await knex.raw('DROP INDEX IF EXISTS idx_unique_active_pin');
  await knex.raw(`
    CREATE UNIQUE INDEX idx_unique_active_pin 
    ON chemical_bottles (pin_5) 
    WHERE is_deleted = false
  `);
};