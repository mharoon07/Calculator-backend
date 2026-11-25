import mongoose from 'mongoose';

const plumbingCostSchema = new mongoose.Schema({
    item: { type: String, required: true },
    material: { type: String, required: true },
    size: { type: String, required: true },
    unit: { type: String, default: 'piece' },
    price: { type: Number, required: true },
    category: { type: String, default: 'general' },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

const PlumbingCost = mongoose.model('PlumbingCost', plumbingCostSchema);
export default PlumbingCost;
