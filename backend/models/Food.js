import mongoose from 'mongoose';

/**
 * Food Model — Quản lý đồ ăn thức uống (F&B)
 * Các category: 'combo' | 'popcorn' | 'drink'
 */
const foodSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    description: {
      type:    String,
      default: '',
      trim:    true,
    },
    price: {
      type:     Number,
      required: true,
      min:      0,
    },
    imageUrl: {
      type:    String,
      default: '',
    },
    category: {
      type:     String,
      enum:     ['combo', 'popcorn', 'drink'],
      required: true,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    sortOrder: {
      type:    Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Index để query nhanh theo category + isActive
foodSchema.index({ category: 1, isActive: 1 });
foodSchema.index({ isActive: 1, sortOrder: 1 });

const Food = mongoose.model('Food', foodSchema);

export default Food;
