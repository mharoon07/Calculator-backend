import mongoose from 'mongoose';

const siteAdminSchema = new mongoose.Schema({
    _id: { type: String, default: 'admin_settings' }, // Keep same ID as Firebase
    adminPinHash: { type: String },
    supervisorPinHash: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const SiteAdmin = mongoose.model('SiteAdmin', siteAdminSchema);
export default SiteAdmin;
