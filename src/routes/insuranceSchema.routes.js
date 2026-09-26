const router = require('express').Router({ mergeParams: true });
const schemaService = require('../services/insuranceSchema.service');
const { ApiResponse } = require('../utils/apiResponse');

// 1. Get all insurance types & subtypes taxonomy
router.get('/insurance-types', (req, res) => {
  const taxonomy = schemaService.getTaxonomy();
  return new ApiResponse(200, 'Insurance taxonomy retrieved', taxonomy).send(res);
});

// 2. Get subtypes for a specific insurance type
router.get('/insurance-types/:type/subtypes', (req, res) => {
  const subtypes = schemaService.getSubtypesByType(req.params.type);
  return new ApiResponse(200, `Subtypes for type ${req.params.type} retrieved`, subtypes).send(res);
});

// 3. Get schema definition for a subtype
router.get('/insurance-schemas/:subtype', (req, res) => {
  const schema = schemaService.getSchemaBySubtype(req.params.subtype);
  if (!schema) {
    return res.status(404).json({ success: false, message: `Schema for subtype ${req.params.subtype} not found` });
  }
  return new ApiResponse(200, `Schema for ${req.params.subtype} retrieved`, schema).send(res);
});

module.exports = router;
