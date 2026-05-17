exports.up = async function(knex) {
  await knex.schema.createTable('transfer_pdfs', (table) => {
    table.increments('id').primary();
    table.integer('transfer_id').unsigned().references('id').inTable('transactions').onDelete('CASCADE');
    table.string('file_path', 500).notNullable();
    table.integer('lab_id').unsigned().references('id').inTable('labs').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('transfer_pdfs');
};