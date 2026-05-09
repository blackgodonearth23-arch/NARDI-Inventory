exports.up = async function(knex) {
  const hasColumn = async (table, col) => {
    const cols = await knex(table).columnInfo();
    return col in cols;
  };

  if (!(await hasColumn('software_licenses', 'package'))) {
    await knex.schema.table('software_licenses', (table) => {
      table.string('package', 255).nullable();
    });
  }
  if (!(await hasColumn('software_licenses', 'duration'))) {
    await knex.schema.table('software_licenses', (table) => {
      table.string('duration', 100).nullable();
    });
  }
  if (!(await hasColumn('software_licenses', 'provider'))) {
    await knex.schema.table('software_licenses', (table) => {
      table.string('provider', 255).nullable();
    });
  }
  // Optionally drop the old license_key column if it exists (not needed)
  // But we'll keep it for backwards compatibility; frontend will just not show it.
};

exports.down = async function(knex) {
  const hasColumn = async (table, col) => {
    const cols = await knex(table).columnInfo();
    return col in cols;
  };

  if (await hasColumn('software_licenses', 'package')) {
    await knex.schema.table('software_licenses', t => t.dropColumn('package'));
  }
  if (await hasColumn('software_licenses', 'duration')) {
    await knex.schema.table('software_licenses', t => t.dropColumn('duration'));
  }
  if (await hasColumn('software_licenses', 'provider')) {
    await knex.schema.table('software_licenses', t => t.dropColumn('provider'));
  }
};