exports.up = async function(knex) {
  // Helper: check if column exists
  const hasColumn = async (table, col) => {
    const cols = await knex(table).columnInfo();
    return col in cols;
  };

  // Helper: check if index exists
  const hasIndex = async (table, indexName) => {
    const result = await knex.raw(`
      SELECT 1
      FROM pg_indexes
      WHERE tablename = ? AND indexname = ?
    `, [table, indexName]);
    return result.rows.length > 0;
  };

  // 1. Drop old type constraint if it still exists
  await knex.raw(`ALTER TABLE ict_hardware DROP CONSTRAINT IF EXISTS ict_hardware_type_check`);

  // 2. Add new columns (if not already present)
  if (!(await hasColumn('ict_hardware', 'asset_id'))) {
    await knex.schema.table('ict_hardware', (table) => {
      table.string('asset_id', 50).nullable().unique();
    });
  }
  if (!(await hasColumn('ict_hardware', 'office_number'))) {
    await knex.schema.table('ict_hardware', (table) => {
      table.string('office_number', 20).nullable();
    });
  }
  if (!(await hasColumn('ict_hardware', 'issued_date'))) {
    await knex.schema.table('ict_hardware', (table) => {
      table.date('issued_date').nullable();
    });
  }
  if (!(await hasColumn('ict_hardware', 'return_date'))) {
    await knex.schema.table('ict_hardware', (table) => {
      table.date('return_date').nullable();
    });
  }
  if (!(await hasColumn('ict_hardware', 'price'))) {
    await knex.schema.table('ict_hardware', (table) => {
      table.decimal('price', 10, 2).nullable();
    });
  }
  if (!(await hasColumn('ict_hardware', 'details'))) {
    await knex.schema.table('ict_hardware', (table) => {
      table.jsonb('details').defaultTo('{}');
    });
  }

  // 3. Add new type constraint
  await knex.raw(`
    ALTER TABLE ict_hardware ADD CONSTRAINT ict_hardware_type_check
    CHECK (type IN ('laptop', 'desktop', 'smartphone', 'lan_phone', 'projector', 'cctv_cam', 'switch', 'router', 'other'))
  `);

  // 4. Index on lab_id for filtering (if not exists)
  if (!(await hasIndex('ict_hardware', 'idx_ict_hardware_lab_id'))) {
    await knex.schema.raw('CREATE INDEX idx_ict_hardware_lab_id ON ict_hardware (lab_id)');
  }

  // 5. Create history table (if not exists)
  if (!(await knex.schema.hasTable('ict_hardware_history'))) {
    await knex.schema.createTable('ict_hardware_history', (table) => {
      table.increments('id').primary();
      table.integer('hardware_id').unsigned().notNullable()
           .references('id').inTable('ict_hardware').onDelete('CASCADE');
      table.integer('changed_by').unsigned().notNullable()
           .references('id').inTable('users').onDelete('SET NULL');
      table.string('action', 50).notNullable();
      table.jsonb('old_values').defaultTo('{}');
      table.jsonb('new_values').defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // 6. Add department_type column to labs (if not exists)
  if (!(await hasColumn('labs', 'department_type'))) {
    await knex.schema.table('labs', (table) => {
      table.string('department_type', 20).defaultTo('lab');
    });
  }

  // 7. Update locations type constraint to include 'station'
  await knex.raw(`ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_type_check`);
  await knex.raw(`
    ALTER TABLE locations ADD CONSTRAINT locations_type_check
    CHECK (type IN ('primary', 'lab_sub', 'station'))
  `);

  // 8. Create other_assets table (if not exists)
  if (!(await knex.schema.hasTable('other_assets'))) {
    await knex.schema.createTable('other_assets', (table) => {
      table.increments('id').primary();
      table.string('asset_id', 50).notNullable().unique();
      table.string('serial_number', 100).nullable();
      table.string('type', 100).notNullable();
      table.text('description').nullable();
      table.integer('department_id').unsigned().notNullable()
           .references('id').inTable('labs').onDelete('CASCADE');
      table.boolean('is_deleted').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('ict_hardware_history');
  await knex.schema.dropTableIfExists('other_assets');

  // Remove added columns from ict_hardware (if exist)
  const hasColumn = async (table, col) => {
    const cols = await knex(table).columnInfo();
    return col in cols;
  };
  if (await hasColumn('ict_hardware', 'asset_id')) {
    await knex.schema.table('ict_hardware', t => t.dropColumn('asset_id'));
  }
  if (await hasColumn('ict_hardware', 'office_number')) {
    await knex.schema.table('ict_hardware', t => t.dropColumn('office_number'));
  }
  if (await hasColumn('ict_hardware', 'issued_date')) {
    await knex.schema.table('ict_hardware', t => t.dropColumn('issued_date'));
  }
  if (await hasColumn('ict_hardware', 'return_date')) {
    await knex.schema.table('ict_hardware', t => t.dropColumn('return_date'));
  }
  if (await hasColumn('ict_hardware', 'price')) {
    await knex.schema.table('ict_hardware', t => t.dropColumn('price'));
  }
  if (await hasColumn('ict_hardware', 'details')) {
    await knex.schema.table('ict_hardware', t => t.dropColumn('details'));
  }

  // Revert type constraint
  await knex.raw(`ALTER TABLE ict_hardware DROP CONSTRAINT IF EXISTS ict_hardware_type_check`);
  await knex.raw(`
    ALTER TABLE ict_hardware ADD CONSTRAINT ict_hardware_type_check
    CHECK (type IN ('laptop', 'desktop', 'smartphone', 'lan_phone', 'projector', 'cctv_cam', 'switch', 'router', 'other'))
  `);

  await knex.schema.table('labs', t => t.dropColumn('department_type'));

  await knex.raw(`ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_type_check`);
  await knex.raw(`
    ALTER TABLE locations ADD CONSTRAINT locations_type_check
    CHECK (type IN ('primary', 'lab_sub'))
  `);
};