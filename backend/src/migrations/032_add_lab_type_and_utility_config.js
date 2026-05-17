// backend/src/migrations/032_add_lab_type_and_utility_config.js

const ALL_PREDEFINED_UTILITY_TYPES = [
  'glassware',
  'plasticware',
  'equipment',
  'instrument',
  'standard',
  'consumable_sanitation',
  'ppe',
  'utensil'
];

exports.up = async function(knex) {
  // 1. Add type column to labs
  await knex.schema.alterTable('labs', (table) => {
    table.enu('type', ['ICT', 'Chemistry', 'Other'])
      .notNullable()
      .defaultTo('Other');
  });

  // 2. Add allowed_utility_types JSON column
  await knex.schema.alterTable('labs', (table) => {
    table.jsonb('allowed_utility_types').nullable();
  });

  // 3. Set default utility types for existing Chemistry and Other labs
  // (ICT labs get NULL — no utilities)
  await knex('labs')
    .where('type', '!=', 'ICT')
    .update({
      allowed_utility_types: JSON.stringify(ALL_PREDEFINED_UTILITY_TYPES)
    });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('labs', (table) => {
    table.dropColumn('allowed_utility_types');
    table.dropColumn('type');
  });
};