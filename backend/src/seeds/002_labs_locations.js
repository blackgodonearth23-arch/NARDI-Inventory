exports.seed = async function(knex) {
  // Delete existing entries (order matters because of foreign keys)
  await knex('locations').del();
  await knex('labs').del();

  // Insert labs and capture the returned IDs properly
  const [foodChemRow] = await knex('labs').insert({
    name: 'Food Chemistry',
    description: 'Food Chemistry Lab'
  }).returning('id');
  const foodChemId = foodChemRow.id;   // it's an object { id: 1 }, we need the .id

  const [microBioRow] = await knex('labs').insert({
    name: 'Micro Biology',
    description: 'Micro Biology Lab'
  }).returning('id');
  const microBioId = microBioRow.id;

  // Insert Main Storage
  await knex('locations').insert({
    name: 'Main Storage',
    type: 'main',
    lab_id: null,
    description: 'Central warehouse'
  });

  // Sub-storages for Food Chemistry
  await knex('locations').insert([
    { name: 'Chemistry Cupboard A', type: 'lab_sub', lab_id: foodChemId },
    { name: 'Chemistry Refrigerator',  type: 'lab_sub', lab_id: foodChemId }
  ]);

  // Sub-storages for Micro Biology
  await knex('locations').insert([
    { name: 'Microbio Cupboard 1', type: 'lab_sub', lab_id: microBioId },
    { name: 'Microbio Refrigerator', type: 'lab_sub', lab_id: microBioId }
  ]);
};