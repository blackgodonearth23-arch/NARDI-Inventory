exports.up = async function(knex) {
  // Drop the existing unique constraint on asset_id (it was a full unique)
  await knex.raw('ALTER TABLE utility_items DROP CONSTRAINT IF EXISTS utility_items_asset_id_unique');

  // Make asset_id nullable
  await knex.schema.alterTable('utility_items', (table) => {
    table.string('asset_id', 50).nullable().alter();
  });

  // Create partial unique index: only enforce uniqueness when asset_id is not null
  await knex.raw(`
    CREATE UNIQUE INDEX idx_utility_asset_id_not_null
    ON utility_items (asset_id)
    WHERE asset_id IS NOT NULL
  `);
};

exports.down = async function(knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_utility_asset_id_not_null');
  // You may want to revert to NOT NULL, but we'll leave it nullable
};