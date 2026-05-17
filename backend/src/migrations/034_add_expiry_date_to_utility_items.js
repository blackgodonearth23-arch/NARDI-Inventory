exports.up = async function(knex) {
  await knex.schema.alterTable('utility_items', (table) => {
    table.date('expiry_date').nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('utility_items', (table) => {
    table.dropColumn('expiry_date');
  });
};