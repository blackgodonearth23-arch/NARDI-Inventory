// backend/src/migrations/035_drop_type_check_constraint.js

exports.up = async function(knex) {
  // Drop the old check constraint on the type column
  await knex.raw(`
    ALTER TABLE utility_items
    DROP CONSTRAINT IF EXISTS utility_items_type_check
  `);
};

exports.down = async function(knex) {
  // If you ever roll back, you'd need to re-add the constraint, but
  // since we no longer restrict types, it's fine to leave it empty.
  // You could optionally recreate it with the old values, but we won't.
};