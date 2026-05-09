exports.up = async function(knex) {
  // Unique active PIN
  await knex.raw(`
    CREATE UNIQUE INDEX idx_unique_active_pin 
    ON chemical_bottles (pin_5) 
    WHERE is_deleted = false
  `);

  // Bottle lookups
  await knex.schema.raw('CREATE INDEX idx_bottles_location ON chemical_bottles (location_id, is_deleted)');
  await knex.schema.raw('CREATE INDEX idx_bottles_chemical ON chemical_bottles (chemical_id, is_deleted)');
  await knex.schema.raw('CREATE INDEX idx_bottles_status ON chemical_bottles (status, is_deleted)');

  // User PIN login
  await knex.schema.raw('CREATE INDEX idx_users_pin ON users (role, lab_id, is_active) WHERE pin_4_hash IS NOT NULL');

  // Transactions for reports
  await knex.schema.raw('CREATE INDEX idx_transactions_created ON transactions (created_at, action_type)');

  // Equipment / utensils transfer checks
  await knex.schema.raw('CREATE INDEX idx_equipment_location ON equipment (location_id, is_deleted)');
  await knex.schema.raw('CREATE INDEX idx_utensils_location_name ON utensils (location_id, name, is_deleted)');
};

exports.down = async function(knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_unique_active_pin');
  await knex.raw('DROP INDEX IF EXISTS idx_bottles_location');
  await knex.raw('DROP INDEX IF EXISTS idx_bottles_chemical');
  await knex.raw('DROP INDEX IF EXISTS idx_bottles_status');
  await knex.raw('DROP INDEX IF EXISTS idx_users_pin');
  await knex.raw('DROP INDEX IF EXISTS idx_transactions_created');
  await knex.raw('DROP INDEX IF EXISTS idx_equipment_location');
  await knex.raw('DROP INDEX IF EXISTS idx_utensils_location_name');
};