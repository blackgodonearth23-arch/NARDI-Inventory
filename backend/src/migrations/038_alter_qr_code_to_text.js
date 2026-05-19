exports.up = async function(knex) {
  await knex.raw('ALTER TABLE chemical_containers ALTER COLUMN qr_code TYPE TEXT');
};

exports.down = async function(knex) {
  await knex.raw('ALTER TABLE chemical_containers ALTER COLUMN qr_code TYPE VARCHAR(255)');
};