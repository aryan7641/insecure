const mongoose = require('mongoose');
require('dotenv').config({ path: '/app/insecure-backend/.env' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Document = mongoose.model('Document', new mongoose.Schema({}, { strict: false }));
  const doc = await Document.findById('6abd63a59e6682c02ef5185c');
  console.log('Document fileName:', doc?.fileName);
  console.log('Customer:', JSON.stringify(doc?.extractedData?.customer, null, 2));
  console.log('Policy:', JSON.stringify(doc?.extractedData?.policy, null, 2));
  console.log('Motor:', JSON.stringify(doc?.extractedData?.motor, null, 2));
  console.log('HealthDetails members:', doc?.extractedData?.healthDetails?.members);
  process.exit(0);
}
check();
