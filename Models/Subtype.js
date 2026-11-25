import mongoose from 'mongoose';

const subtypeSchema = new mongoose.Schema({
    calculatorId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    longDescription: { type: String, default: "" },
    image: { type: String },
    materialCost: { type: mongoose.Schema.Types.Mixed, default: {} },
    finishing: { type: mongoose.Schema.Types.Mixed, default: {} },
    ratesAndNotes: { type: mongoose.Schema.Types.Mixed, default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

const Subtype = mongoose.model('Subtype', subtypeSchema);
export default Subtype;
