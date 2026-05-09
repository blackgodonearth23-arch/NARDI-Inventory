exports.up = async function(knex) {
  const hasColumn = async (table, col) => {
    const cols = await knex(table).columnInfo();
    return col in cols;
  };

  if (await hasColumn('chemicals', 'physical_form')) {
    await knex.schema.table('chemicals', (table) => table.dropColumn('physical_form'));
  }
  if (await hasColumn('chemicals', 'unit')) {
    await knex.schema.table('chemicals', (table) => table.dropColumn('unit'));
  }
};

exports.down = async function(knex) {
  await knex.schema.table('chemicals', (table) => {
    table.string('physical_form', 50).defaultTo('liquid');
    table.string('unit', 50).defaultTo('bottle');
  });
};