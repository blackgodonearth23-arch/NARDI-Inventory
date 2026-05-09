exports.up = async function(knex) {
  // Make pin_5 nullable
  await knex.schema.alterTable('chemical_containers', (table) => {
    table.string('pin_5', 5).nullable().alter();
  });

  // Drop old unique index that included all active rows
  await knex.raw('DROP INDEX IF EXISTS idx_unique_active_pin');

  // Create new conditional unique index – only when pin_5 is not null and is_deleted = false
  await knex.raw(`
    CREATE UNIQUE INDEX idx_unique_active_pin
    ON chemical_containers (pin_5)
    WHERE is_deleted = false AND pin_5 IS NOT NULL
  `);
};

exports.down = async function(knex) {
  // Revert to not nullable – but may fail if nulls exist; we'll skip for now
};