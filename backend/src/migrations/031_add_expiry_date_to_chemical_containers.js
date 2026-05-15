exports.up = function(knex) {
  return knex.schema.alterTable('chemical_containers', (table) => {
    table.date('expiry_date').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('chemical_containers', (table) => {
    table.dropColumn('expiry_date');
  });
};