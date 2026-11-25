import mongoose from 'mongoose';

const calculatorUsageSchema = new mongoose.Schema({
    calculatorId: { type: String, required: true },
    calculatorName: { type: String, default: "Unknown" },
    userId: { type: String, default: "anonymous" },
    userName: { type: String, default: "Anonymous User" },
    timestamp: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

const CalculatorUsage = mongoose.model('CalculatorUsage', calculatorUsageSchema);
export default CalculatorUsage;
