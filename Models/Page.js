import mongoose from 'mongoose';

const pageSchema = new mongoose.Schema({
    slug: { type: String, required: true, unique: true },
    title: String,
    content: String,
    updatedAt: { type: Date, default: Date.now }
}, { strict: false });

const Page = mongoose.model('Page', pageSchema);
export default Page;
