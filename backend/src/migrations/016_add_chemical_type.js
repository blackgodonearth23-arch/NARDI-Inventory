exports.up = function(knex) {
  return knex.schema.table('chemicals', (table) => {
    table.string('chemical_type', 50).defaultTo('Other');   // e.g. Solution, Solvent, Salt...
  });
};

exports.down = function(knex) {
  return knex.schema.table('chemicals', (table) => {
    table.dropColumn('chemical_type');
  });
};