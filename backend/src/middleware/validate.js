const Joi = require('joi');

function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: false });
    if (error) {
      const message = error.details.map(d => d.message).join(', ');
      return res.status(400).json({ error: message });
    }
    req[property] = value;   // Replace with validated values
    next();
  };
}

module.exports = validate;