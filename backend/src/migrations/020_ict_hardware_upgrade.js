exports.up = async function(knex) {
  // 1. Add only columns that do not already exist
  const hasColumn = async (table, column) => {
    const cols = await knex(table).columnInfo();
    return column in cols;
  };

  if (!(await hasColumn('ict_hardware', 'computer_name'))) {
    await knex.schema.table('ict_hardware', (table) => {
      table.string('computer_name', 100).notNullable().defaultTo('');
    });
  }

  if (!(await hasColumn('ict_hardware', 'assigned_to_employee'))) {
    await knex.schema.table('ict_hardware', (table) => {
      table.string('assigned_to_employee', 255).nullable();
    });
  }

  // Add lab_id as nullable first, then populate and make NOT NULL
  if (!(await hasColumn('ict_hardware', 'lab_id'))) {
    await knex.schema.table('ict_hardware', (table) => {
      table.integer('lab_id').unsigned().nullable();
    });
  }

  // Populate lab_id from existing locations (if any)
  await knex.raw(`
    UPDATE ict_hardware hw
    SET lab_id = (
      SELECT l.lab_id FROM locations l WHERE l.id = hw.location_id
    )
    WHERE hw.location_id IS NOT NULL
  `);

  // For any still null, set to a sensible default (first lab)
  const defaultLab = await knex('labs').first();
  if (defaultLab) {
    await knex('ict_hardware').whereNull('lab_id').update({ lab_id: defaultLab.id });
  }

  // Now make lab_id NOT NULL
  await knex.schema.alterTable('ict_hardware', (table) => {
    table.integer('lab_id').notNullable().alter();
  });

  // Add foreign key constraint if not exists
  try {
    await knex.schema.alterTable('ict_hardware', (table) => {
      table.foreign('lab_id').references('id').inTable('labs').onDelete('RESTRICT');
    });
  } catch (err) {
    // Foreign key may already exist; ignore
  }

  // Add unique index on (lab_id, computer_name) where not deleted
  await knex.raw(`
    DROP INDEX IF EXISTS idx_ict_hw_unique_computer_name;
    CREATE UNIQUE INDEX idx_ict_hw_unique_computer_name
    ON ict_hardware (lab_id, computer_name)
    WHERE is_deleted = false
  `);

  // Update type check constraint – drop old, add new
  await knex.raw(`
    ALTER TABLE ict_hardware DROP CONSTRAINT IF EXISTS ict_hardware_type_check;
    ALTER TABLE ict_hardware ADD CONSTRAINT ict_hardware_type_check
      CHECK (type IN ('laptop', 'desktop', 'phone', 'printer', 'projector', 'other'));
  `);

  // Add prefix column to labs
  if (!(await hasColumn('labs', 'prefix'))) {
    await knex.schema.table('labs', (table) => {
      table.string('prefix', 10).nullable();
    });
  }

  // Add procured_by to software_licenses
  if (!(await hasColumn('software_licenses', 'procured_by'))) {
    await knex.schema.table('software_licenses', (table) => {
      table.string('procured_by', 255).nullable();
    });
  }
};

exports.down = async function(knex) {
  // Remove added columns if they exist
  const hasColumn = async (table, column) => {
    const cols = await knex(table).columnInfo();
    return column in cols;
  };

  if (await hasColumn('ict_hardware', 'computer_name')) {
    await knex.schema.table('ict_hardware', (table) => {
      table.dropColumn('computer_name');
    });
  }

  if (await hasColumn('ict_hardware', 'assigned_to_employee')) {
    await knex.schema.table('ict_hardware', (table) => {
      table.dropColumn('assigned_to_employee');
    });
  }

  // Remove lab_id only if it exists and drop FK first
  if (await hasColumn('ict_hardware', 'lab_id')) {
    await knex.schema.table('ict_hardware', (table) => {
      table.dropForeign('lab_id');
      table.dropColumn('lab_id');
    });
  }

  await knex.raw('DROP INDEX IF EXISTS idx_ict_hw_unique_computer_name');

  // Restore old type check constraint
  await knex.raw(`
    ALTER TABLE ict_hardware DROP CONSTRAINT IF EXISTS ict_hardware_type_check;
    ALTER TABLE ict_hardware ADD CONSTRAINT ict_hardware_type_check
      CHECK (type IN ('pc', 'printer', 'monitor', 'peripheral', 'other'));
  `);

  if (await hasColumn('labs', 'prefix')) {
    await knex.schema.table('labs', (table) => {
      table.dropColumn('prefix');
    });
  }

  if (await hasColumn('software_licenses', 'procured_by')) {
    await knex.schema.table('software_licenses', (table) => {
      table.dropColumn('procured_by');
    });
  }
};