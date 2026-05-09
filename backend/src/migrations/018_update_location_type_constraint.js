exports.up = async function(knex) {
  // Drop the old check constraint
  await knex.raw(`
    ALTER TABLE locations
    DROP CONSTRAINT IF EXISTS locations_type_check
  `);
  // Add the new check constraint with 'primary' instead of 'main'
  await knex.raw(`
    ALTER TABLE locations
    ADD CONSTRAINT locations_type_check
    CHECK (type IN ('primary', 'lab_sub'))
  `);
};

exports.down = async function(knex) {
  await knex.raw(`
    ALTER TABLE locations
    DROP CONSTRAINT IF EXISTS locations_type_check
  `);
  await knex.raw(`
    ALTER TABLE locations
    ADD CONSTRAINT locations_type_check
    CHECK (type IN ('main', 'lab_sub'))
  `);
};