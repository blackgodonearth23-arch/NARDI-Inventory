exports.up = async function(knex) {
  // Add asset_id as nullable first (to fill existing rows)
  await knex.schema.table('utility_items', (table) => {
    table.string('asset_id', 50).nullable();
    table.integer('lab_id').unsigned().nullable()
         .references('id').inTable('labs').onDelete('SET NULL');
  });

  // Generate unique asset_ids for existing rows (use id as suffix)
  const rows = await knex('utility_items').select('id');
  for (const row of rows) {
    await knex('utility_items')
      .where({ id: row.id })
      .update({ asset_id: `AST-${String(row.id).padStart(4, '0')}` });
  }

  // Set lab_id for existing rows – default to 1 if none (adjust as needed)
  const defaultLab = await knex('labs').first();
  if (defaultLab) {
    await knex('utility_items').whereNull('lab_id').update({ lab_id: defaultLab.id });
  }

  // Now make asset_id unique and not nullable
  await knex.schema.alterTable('utility_items', (table) => {
    table.string('asset_id', 50).notNullable().alter();
    table.unique('asset_id');
    table.integer('lab_id').unsigned().notNullable().alter();
  });

  // Drop org_serial column if it exists
  const hasColumn = async (table, col) => {
    const cols = await knex(table).columnInfo();
    return col in cols;
  };
  if (await hasColumn('utility_items', 'org_serial')) {
    await knex.schema.table('utility_items', (table) => table.dropColumn('org_serial'));
  }

  // Ensure proper type enum (old one might not have all types)
  await knex.raw(`ALTER TABLE utility_items DROP CONSTRAINT IF EXISTS utility_items_type_check`);
  await knex.raw(`
    ALTER TABLE utility_items ADD CONSTRAINT utility_items_type_check
    CHECK (type IN ('glassware', 'plasticware', 'equipment', 'instrument', 'standard', 'consumable_sanitation', 'ppe', 'utensil'))
  `);
};

exports.down = async function(knex) {
  // Reverse is difficult; we'll just drop added columns and add back org_serial
  await knex.schema.table('utility_items', (table) => {
    table.dropColumn('asset_id');
    table.dropColumn('lab_id');
    table.string('org_serial', 100).nullable();
  });
};