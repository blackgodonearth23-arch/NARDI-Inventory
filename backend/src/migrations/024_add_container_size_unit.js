// backend/src/migrations/024_add_container_size_unit.js
exports.up = async function(knex) {
  await knex.schema.table('chemical_containers', (table) => {
    table.decimal('container_size', 10, 2).nullable();
    table.string('container_unit', 20).nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.table('chemical_containers', (table) => {
    table.dropColumn('container_size');
    table.dropColumn('container_unit');
  });
};