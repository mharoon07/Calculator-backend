import Calculator from "../../Models/Calculator.js";
import Subtype from "../../Models/Subtype.js";
import fs from 'fs';
import path from 'path';
import multer from "multer";
import cloudinary from "../../utils/cloudinary.js";
import stream from "stream";
const upload = multer({ storage: multer.memoryStorage() });

export const getCalculators = async (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'calculators.json');
    const data = fs.readFileSync(filePath, 'utf8');
    const calculators = JSON.parse(data);
    res.json(calculators);
  } catch (err) {
    console.error("Error reading calculators json:", err);
    res.status(500).json({ error: "Failed to fetch calculators" });
  }
};
export const addCalculator = async (req, res) => {
  try {
    const { title, icon, banner, shortDescription, longDescription } = req.body;

    if (!title || !icon || !banner) {
      return res.status(400).json({ success: false, message: "Title, icon, and banner are required" });
    }

    const newCalculator = new Calculator({
      title,
      icon,
      banner,
      shortDescription: shortDescription || "",
      longDescription: longDescription || "",
    });

    await newCalculator.save();

    res.json({
      success: true,
      calculator: newCalculator,
      message: "✅ Calculator added successfully"
    });
  } catch (err) {
    console.error("❌ Error adding calculator:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateCalculator = async (req, res) => {
  const { id } = req.params;
  const { title, icon, banner, shortDescription, longDescription } = req.body;

  try {
    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const updateData = {
      title,
      icon,
      banner,
      shortDescription: shortDescription || "",
      longDescription: longDescription || "",
      updatedAt: new Date()
    };

    console.log("📝 Updating calculator:", id, updateData);

    const updatedCalculator = await Calculator.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedCalculator) {
      return res.status(404).json({ success: false, message: "Calculator not found" });
    }

    res.json({
      success: true,
      message: "✅ Calculator updated",
      calculator: updatedCalculator
    });
  } catch (err) {
    console.error("❌ Error updating calculator:", err);
    res.status(500).json({ success: false, error: "Failed to update calculator" });
  }
};

export const deleteCalculator = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Calculator.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Calculator not found" });
    }
    res.json({ success: true, message: "🗑️ Calculator deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete calculator" });
  }
};

export const getSubtypes = async (req, res) => {
  const { id } = req.params;

  try {
    const subtypes = await Subtype.find({ calculatorId: id });

    if (!subtypes || subtypes.length === 0) {
      return res.status(404).json({ success: false, message: "No subtypes found for this calculator" });
    }

    res.json({ success: true, subtypes });
  } catch (err) {
    console.error("❌ Error fetching subtypes:", err);
    res.status(500).json({ success: false, message: "Failed to fetch subtypes" });
  }
};

export const getGreyStructureMaterialCosts = async (req, res) => {
  console.log("Fetching grey structure material costs...");
  try {
    const { subtypeId } = req.params;
    const subtype = await Subtype.findById(subtypeId);

    if (!subtype) {
      return res.status(404).json({ success: false, message: "❌ Subtype not found" });
    }

    if (!subtype.materialCost) {
      // If it exists but has no material cost, we just return empty or default
      return res.json({
        success: true,
        description: subtype.description,
        title: subtype.title,
        materialCost: {}
      });
    }

    res.json({
      success: true,
      description: subtype.description,
      title: subtype.title,
      materialCost: subtype.materialCost,
    });
  } catch (err) {
    console.error("❌ Error fetching material costs:", err);
    res.status(500).json({ success: false, message: "Failed to fetch material costs" });
  }
};


export const updateSubtypeDetails = [
  upload.single("image"),
  async (req, res) => {
    try {
      const { subtypeId } = req.params;
      const { title, description, shortDescription, longDescription } = req.body;

      if (!subtypeId) {
        return res.status(400).json({ success: false, message: "⚠️ subtypeId is required" });
      }

      const subtype = await Subtype.findById(subtypeId);
      if (!subtype) {
        return res.status(404).json({ success: false, message: "❌ Subtype not found" });
      }

      const updatedData = { updatedAt: new Date() };
      if (title) updatedData.title = title;
      if (description) updatedData.description = description;
      if (shortDescription !== undefined) updatedData.shortDescription = shortDescription || "";
      if (longDescription !== undefined) updatedData.longDescription = longDescription || "";

      if (req.file) {
        // ✅ Wrap cloudinary upload stream in a Promise
        const uploadStream = () =>
          new Promise((resolve, reject) => {
            const cldStream = cloudinary.uploader.upload_stream(
              { folder: "calculator_subtypes" },
              (error, result) => {
                if (error) return reject(error);
                resolve(result);
              }
            );

            const bufferStream = new stream.PassThrough();
            bufferStream.end(req.file.buffer);
            bufferStream.pipe(cldStream);
          });

        try {
          const result = await uploadStream();
          updatedData.image = result.secure_url;
        } catch (uploadErr) {
          console.error("❌ Cloudinary upload failed:", uploadErr);
          return res.status(500).json({ success: false, message: "Cloudinary upload failed" });
        }
      }

      await Subtype.findByIdAndUpdate(subtypeId, updatedData);
      res.json({ success: true, message: "✅ Subtype updated successfully", updatedData });
    } catch (err) {
      console.error("❌ Error updating subtype:", err);
      res.status(500).json({ success: false, message: "Failed to update subtype" });
    }
  },
];


export const getSubtypeDetails = async (req, res) => {
  console.log("Fetching subtype details...");
  try {
    const { subtypeId } = req.params; // expect subtypeId in URL like /subtypes/:subtypeId
    const subtype = await Subtype.findById(subtypeId);

    if (!subtype) {
      return res.status(404).json({ success: false, message: "❌ Subtype not found" });
    }

    res.json({
      success: true,
      title: subtype.title || null,
      image: subtype.image || null,
      description: subtype.description || null,
      shortDescription: subtype.shortDescription || "",
      longDescription: subtype.longDescription || "",
    });
  } catch (err) {
    console.error("❌ Error fetching subtype details:", err);
    res.status(500).json({ success: false, message: "Failed to fetch subtype details" });
  }
};

export const updateSubtype = async (req, res) => {
  try {
    const { calculatorId, subtypeId } = req.params;
    const data = req.body;

    if (!data.title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    if (data.materialCost) {
      for (const [key, value] of Object.entries(data.materialCost)) {
        if (value !== "" && (isNaN(value) || Number(value) < 0)) {
          return res.status(400).json({
            success: false,
            message: `${key.replace(/([A-Z])/g, " $1")} must be a valid non-negative number`,
          });
        }
      }
    }

    const subtype = await Subtype.findById(subtypeId);
    if (!subtype) {
      return res.status(404).json({ success: false, message: "❌ Subtype not found" });
    }

    await Subtype.findByIdAndUpdate(subtypeId, {
      calculatorId,
      title: data.title,
      description: data.description || "",
      shortDescription: data.shortDescription || "",
      longDescription: data.longDescription || "",
      materialCost: data.materialCost || {},
      ratesAndNotes: data.ratesAndNotes || [],
      updatedAt: new Date()
    });

    res.json({ success: true, message: "Subtype updated successfully" });
  } catch (err) {
    console.error("❌ Error updating subtype:", err);
    res.status(500).json({ success: false, message: "Failed to update subtype" });
  }
};