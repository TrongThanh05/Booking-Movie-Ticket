import mongoose from 'mongoose';

const theaterSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    location: { type: String, required: true },
  address: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    image: { type: String },
    totalRooms: { type: Number, default: 1 },
    amenities: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Theater = mongoose.model('Theater', theaterSchema);

export default Theater;
