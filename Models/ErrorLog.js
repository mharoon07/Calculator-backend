import mongoose from 'mongoose';

const errorLogSchema = new mongoose.Schema({
    message: String,
    stack: String,
    userId: String,
    path: String,
    method: String,
    timestamp: { type: Date, default: Date.now }
});

const ErrorLog = mongoose.model('ErrorLog', errorLogSchema);
export default ErrorLog;
