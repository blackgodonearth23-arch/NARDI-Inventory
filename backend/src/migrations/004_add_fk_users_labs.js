exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.foreign('lab_id').references('id').inTable('labs').onDelete('SET NULL');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropForeign('lab_id');
  });
};