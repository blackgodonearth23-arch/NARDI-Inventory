exports.up = async function(knex) {
  await knex.schema.createTable('audit_reports', (table) => {
    table.increments('id').primary();
    table.integer('lab_id').unsigned().notNullable()
         .references('id').inTable('labs').onDelete('CASCADE');
    table.integer('created_by').unsigned().notNullable()
         .references('id').inTable('users').onDelete('CASCADE');
    table.string('type', 20).notNullable(); // 'chemical' or 'utility'
    table.string('status', 20).notNullable().defaultTo('pending'); // pending, approved, rejected
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('audit_report_items', (table) => {
    table.increments('id').primary();
    table.integer('report_id').unsigned().notNullable()
         .references('id').inTable('audit_reports').onDelete('CASCADE');
    table.integer('item_id').unsigned().notNullable(); // chemical_id or utility_item_id
    table.string('item_type', 20).notNullable(); // 'chemical' or 'utility'
    table.integer('expected_count').notNullable();
    table.integer('actual_count').nullable();
    table.text('notes').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('audit_report_items')
    .dropTableIfExists('audit_reports');
};