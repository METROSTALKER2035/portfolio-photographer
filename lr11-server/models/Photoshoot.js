import mongoose from 'mongoose';

const photoshootSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Поле title є обов'язковим"],
      trim: true,
      unique: true,
      minlength: [2, 'title: щонайменше 2 символи'],
      maxlength: [100, 'title: не більше 100 символів'],
    },
    category: {
      type: String,
      required: [true, "Поле category є обов'язковим"],
      trim: true,
      enum: {
        values: ['portrait', 'wedding', 'studio', 'reportage'],
        message: 'category: допустимі значення portrait, wedding, studio, reportage',
      },
    },
    price: {
      type: Number,
      required: [true, "Поле price є обов'язковим"],
      cast: 'price: значення має бути числом',
      min: [0, 'price: не менше 0'],
      max: [100000, 'price: не більше 100000'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        delete ret._id;
      },
    },
  }
);

export default mongoose.model('Photoshoot', photoshootSchema);