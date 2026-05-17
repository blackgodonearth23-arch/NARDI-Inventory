exports.up = async function(knex) {
  await knex.schema.alterTable('chemical_containers', (table) => {
    table.string('qr_code', 255).nullable();
    table.boolean('current').notNullable().defaultTo(true);
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('chemical_containers', (table) => {
    table.dropColumn('qr_code');
    table.dropColumn('current');
  });
};