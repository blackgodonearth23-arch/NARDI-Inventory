exports.up = async function(knex) {
  // Drop old columns if they exist (we don't need license_type, total_seats, procured_by, license_key)
  const hasColumn = async (table, col) => {
    const cols = await knex(table).columnInfo();
    return col in cols;
  };

  if (await hasColumn('software_licenses', 'license_type')) {
    await knex.schema.table('software_licenses', t => t.dropColumn('license_type'));
  }
  if (await hasColumn('software_licenses', 'total_seats')) {
    await knex.schema.table('software_licenses', t => t.dropColumn('total_seats'));
  }
  if (await hasColumn('software_licenses', 'procured_by')) {
    await knex.schema.table('software_licenses', t => t.dropColumn('procured_by'));
  }
  if (await hasColumn('software_licenses', 'license_key')) {
    await knex.schema.table('software_licenses', t => t.dropColumn('license_key'));
  }

  // Drop assignment table if it exists
  await knex.schema.dropTableIfExists('license_assignments');
};

exports.down = async function(knex) {
  const hasColumn = async (table, col) => {
    const cols = await knex(table).columnInfo();
    return col in cols;
  };

  if (!(await hasColumn('software_licenses', 'license_type'))) {
    await knex.schema.table('software_licenses', t => t.string('license_type', 50).defaultTo('org_wide'));
  }
  if (!(await hasColumn('software_licenses', 'total_seats'))) {
    await knex.schema.table('software_licenses', t => t.integer('total_seats').defaultTo(1));
  }
  if (!(await hasColumn('software_licenses', 'procured_by'))) {
    await knex.schema.table('software_licenses', t => t.string('procured_by', 255).nullable());
  }
  if (!(await hasColumn('software_licenses', 'license_key'))) {
    await knex.schema.table('software_licenses', t => t.string('license_key', 500).nullable());
  }

  if (!(await knex.schema.hasTable('license_assignments'))) {
    await knex.schema.createTable('license_assignments', (table) => {
      table.increments('id').primary();
      table.integer('license_id').unsigned().references('id').inTable('software_licenses').onDelete('CASCADE');
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    });
  }
};