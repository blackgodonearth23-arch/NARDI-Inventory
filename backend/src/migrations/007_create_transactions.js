exports.up = function(knex) {
  return knex.schema.createTable('transactions', (table) => {
    table.bigIncrements('id').primary();
    table.integer('user_id').unsigned().notNullable()
         .references('id').inTable('users').onDelete('RESTRICT');
    table.enu('action_type', [
      'transfer',          // moving items between locations
      'bottle_opened',     // lab user opened a bottle
      'broken_reported',   // lab user reported broken equipment/utensil
      'stock_adjustment',  // keeper manually adjusted quantity
      'consumption'        // future use
    ]).notNullable();
    table.string('item_type', 50).notNullable();  // 'bottle', 'equipment', 'utensil', 'chemical_stock'
    table.integer('item_id').unsigned().notNullable();     // id in the respective table
    table.integer('from_location_id').unsigned().nullable()
         .references('id').inTable('locations').onDelete('SET NULL');
    table.integer('to_location_id').unsigned().nullable()
         .references('id').inTable('locations').onDelete('SET NULL');
    table.integer('quantity_change').nullable();            // for utensil counts, bottle count changes
    table.jsonb('metadata').nullable();                     // extra details (e.g., PIN for bottle)
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('transactions');
};