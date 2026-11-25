import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
    elements: [{
        id: String,
        name: String,
        unit: String,
        targetQty: Number,
        contractValue: Number,
        plannedWeeklyQty: Number
    }],
    logs: [{
        date: Date,
        elementId: String,
        qty: Number,
        location: String,
        workers: Number,
        hours: Number,
        quality: String,
        issues: String,
        photos: [String],
        createdAt: { type: Date, default: Date.now }
    }],
    payments: [{
        date: Date,
        amount: Number,
        ref: String,
        elementId: String,
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

const Project = mongoose.model('Project', projectSchema);
export default Project;
