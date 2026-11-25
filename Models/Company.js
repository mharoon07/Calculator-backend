import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String },
    email: { type: String },
    phone1: { type: String },
    phone2: { type: String },
    logo: { type: String },
    disclaimer: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

const Company = mongoose.model('Company', companySchema);
export default Company;
