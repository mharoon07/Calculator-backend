import Company from "../../Models/Company.js";

export const getCompany = async (req, res) => {
  try {
    const company = await Company.findOne({});

    if (!company) {
      return res.status(404).json({ success: false, message: "❌ No company found" });
    }

    res.json({
      success: true,
      id: company._id,
      name: company.name,
      address: company.address,
      email: company.email || "",
      phone1: company.phone1,
      phone2: company.phone2,
      logo: company.logo,
      disclaimer: company.disclaimer
    });
  } catch (err) {
    console.error("❌ Error fetching company:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const addCompany = async (req, res) => {
  const { name, address, email, phone1, phone2, logo, disclaimer } = req.body;

  try {
    if (!name || !address) {
      return res.status(400).json({
        success: false,
        message: "Company name and address are required",
      });
    }

    const existingCompany = await Company.findOne({});
    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: "❌ Company already exists, use PUT /company to update it",
      });
    }

    const newCompany = new Company({
      name,
      address,
      email: email || "",
      phone1,
      phone2,
      logo,
      disclaimer,
    });

    await newCompany.save();

    res.json({ success: true, message: "✅ Company added successfully", id: newCompany._id });
  } catch (err) {
    console.error("❌ Error adding company:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateCompany = async (req, res) => {
  const { name, address, email, phone1, phone2, logo, disclaimer } = req.body;

  try {
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Company name and email are required",
      });
    }

    // Upsert: Update the first one found, or create a new one if none exists.
    const company = await Company.findOneAndUpdate(
      {}, // Match any document (singleton pattern)
      {
        name,
        address,
        email,
        phone1,
        phone2,
        logo,
        disclaimer,
        updatedAt: new Date()
      },
      {
        new: true,
        upsert: true, // Create if not found
        setDefaultsOnInsert: true // Apply schema defaults
      }
    );

    res.json({ success: true, message: "✅ Company updated successfully", company });
  } catch (err) {
    console.error("❌ Error updating company:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};