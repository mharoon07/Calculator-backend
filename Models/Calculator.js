import mongoose from 'mongoose';

const calculatorSchema = new mongoose.Schema({
    title: { type: String, required: true },
    icon: { type: String },
    banner: { type: String },
    shortDescription: { type: String, default: "" },
    longDescription: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

const Calculator = mongoose.model('Calculator', calculatorSchema);
export default Calculator;
