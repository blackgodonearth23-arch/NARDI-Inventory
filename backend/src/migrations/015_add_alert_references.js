exports.up = async function(knex) {
  // Add reference columns to alerts for deduplication
  await knex.schema.table('alerts', (table) => {
    table.string('reference_type', 50).nullable();   // e.g., 'chemical', 'equipment', 'license'
    table.integer('reference_id').unsigned().nullable(); // ID of the related entity
  });

  // Index for fast lookups
  await knex.schema.raw(
    `CREATE INDEX idx_alerts_user_ref ON alerts (user_id, type, reference_type, reference_id)`
  );
};

exports.down = async function(knex) {
  await knex.schema.table('alerts', (table) => {
    table.dropColumn('reference_type');
    table.dropColumn('reference_id');
  });
  await knex.schema.raw('DROP INDEX IF EXISTS idx_alerts_user_ref');
};