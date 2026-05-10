exports.up = async function(knex) {
  // 1. Drop the old constraint (if it still exists)
  await knex.raw(`ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_type_check`);

  // 2. Add the correct constraint with all allowed types
  await knex.raw(`
    ALTER TABLE locations ADD CONSTRAINT locations_type_check
    CHECK (type IN ('primary', 'lab_sub', 'station'))
  `);

  // 3. Update any legacy 'main' rows to 'primary'
  await knex('locations').where('type', 'main').update('type', 'primary');
};

exports.down = async function(knex) {
  await knex.raw(`ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_type_check`);
  await knex.raw(`
    ALTER TABLE locations ADD CONSTRAINT locations_type_check
    CHECK (type IN ('primary', 'lab_sub'))
  `);
};