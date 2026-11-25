import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
    title: String,
    description: String,
    icon: String,
    image: String,
    createdAt: { type: Date, default: Date.now }
});

const Service = mongoose.model('Service', serviceSchema);
export default Service;
