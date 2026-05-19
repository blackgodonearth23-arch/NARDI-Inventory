exports.up = async function(knex) {
  // Drop existing constraint
  await knex.raw('ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check');
  // Add new constraint with the additional type
  await knex.raw(
    "ALTER TABLE alerts ADD CONSTRAINT alerts_type_check CHECK (type IN ('low_stock','broken_equipment','license_expiry','expiring_chemical'))"
  );
};

exports.down = async function(knex) {
  await knex.raw('ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check');
  await knex.raw(
    "ALTER TABLE alerts ADD CONSTRAINT alerts_type_check CHECK (type IN ('low_stock','broken_equipment','license_expiry'))"
  );
};