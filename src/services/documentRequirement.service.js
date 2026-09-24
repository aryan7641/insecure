const DocumentRequirement = require('../models/DocumentRequirement');
const Document = require('../models/Document');
const { NotFoundError } = require('../utils/apiError');

const create = async (agencyId, data, user) => {
  const reqt = new DocumentRequirement({ ...data, agencyId });
  await reqt.save();
  return reqt;
};

const list = async (agencyId, filters) => {
  const query = { agencyId };
  if (filters.module) query.module = filters.module;
  return await DocumentRequirement.find(query).sort({ name: 1 });
};

const update = async (reqId, agencyId, data) => {
  const reqt = await DocumentRequirement.findOne({ _id: reqId, agencyId });
  if (!reqt) throw new NotFoundError('Document requirement not found');
  
  Object.assign(reqt, data);
  await reqt.save();
  return reqt;
};

const remove = async (reqId, agencyId) => {
  const reqt = await DocumentRequirement.findOneAndDelete({ _id: reqId, agencyId });
  if (!reqt) throw new NotFoundError('Document requirement not found');
};

const getCustomerDocumentStatus = async (customerId, agencyId) => {
  const [requirements, documents] = await Promise.all([
    DocumentRequirement.find({ agencyId }),
    Document.find({ customerId, agencyId })
  ]);

  const docTypeSet = new Set(documents.map(d => d.type));

  const status = {
    insurance: { required: [], uploaded: [], pending: [] },
    mutual_fund: { required: [], uploaded: [], pending: [] },
    general: { required: [], uploaded: [], pending: [] }
  };

  requirements.forEach(req => {
    const mod = req.module;
    if (!status[mod]) return;
    
    status[mod].required.push(req);
    if (docTypeSet.has(req.documentType)) {
      status[mod].uploaded.push(req);
    } else {
      status[mod].pending.push(req);
    }
  });

  return status;
};

module.exports = {
  create,
  list,
  update,
  delete: remove,
  getCustomerDocumentStatus
};
